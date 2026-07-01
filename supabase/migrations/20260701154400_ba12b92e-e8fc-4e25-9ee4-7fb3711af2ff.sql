
-- ============================================================================
-- 1. CREATOR VISIBILITY on intents
-- ============================================================================

ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS creator_visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS visibility_locked_at timestamptz;

ALTER TABLE public.intents
  DROP CONSTRAINT IF EXISTS intents_creator_visibility_check;
ALTER TABLE public.intents
  ADD CONSTRAINT intents_creator_visibility_check
  CHECK (creator_visibility IN ('public','anonymous'));

-- Helper: lock the parent intent on first interaction
CREATE OR REPLACE FUNCTION public.lock_intent_visibility(_intent_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.intents
     SET visibility_locked_at = now()
   WHERE id = _intent_id
     AND visibility_locked_at IS NULL;
$$;

-- Trigger sources: any participation, form submission, or connection referencing the intent
CREATE OR REPLACE FUNCTION public.on_intent_participant_lock_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.lock_intent_visibility(NEW.intent_id);
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_lock_visibility_on_participant ON public.intent_participants;
CREATE TRIGGER trg_lock_visibility_on_participant
AFTER INSERT ON public.intent_participants
FOR EACH ROW EXECUTE FUNCTION public.on_intent_participant_lock_visibility();

CREATE OR REPLACE FUNCTION public.on_form_submission_lock_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.lock_intent_visibility(NEW.intent_id);
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_lock_visibility_on_form_submission ON public.journey_form_submissions;
CREATE TRIGGER trg_lock_visibility_on_form_submission
AFTER INSERT ON public.journey_form_submissions
FOR EACH ROW EXECUTE FUNCTION public.on_form_submission_lock_visibility();

CREATE OR REPLACE FUNCTION public.on_connection_lock_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.intent_id IS NOT NULL THEN
    PERFORM public.lock_intent_visibility(NEW.intent_id);
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_lock_visibility_on_connection ON public.connections;
CREATE TRIGGER trg_lock_visibility_on_connection
AFTER INSERT ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.on_connection_lock_visibility();

-- Redaction helper: is the creator visible to _viewer for this intent?
CREATE OR REPLACE FUNCTION public.can_see_creator(_intent_id uuid, _viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH i AS (
    SELECT id, creator_id, creator_visibility FROM public.intents WHERE id = _intent_id
  )
  SELECT
    COALESCE((SELECT creator_visibility FROM i) = 'public', true)
    OR EXISTS (SELECT 1 FROM i WHERE creator_id = _viewer)
    OR EXISTS (
      SELECT 1 FROM public.intent_participants p
       WHERE p.intent_id = _intent_id
         AND p.user_id = _viewer
         AND p.state IN ('joining','confirmed')
    )
    OR EXISTS (
      SELECT 1 FROM public.connections c, i
       WHERE c.state = 'accepted'
         AND (
              (c.user_a = i.creator_id AND c.user_b = _viewer)
           OR (c.user_b = i.creator_id AND c.user_a = _viewer)
         )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_see_creator(uuid, uuid) TO authenticated, anon;

-- ============================================================================
-- 2a. user_reputation_stats
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_reputation_stats (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  intents_created integer NOT NULL DEFAULT 0,
  intents_fulfilled integer NOT NULL DEFAULT 0,
  intents_closed integer NOT NULL DEFAULT 0,
  intents_expired integer NOT NULL DEFAULT 0,
  total_interested_received integer NOT NULL DEFAULT 0,
  total_connections integer NOT NULL DEFAULT 0,
  total_joined_participants integer NOT NULL DEFAULT 0,
  repeat_participants integer NOT NULL DEFAULT 0,
  repeat_connections integer NOT NULL DEFAULT 0,
  returning_members integer NOT NULL DEFAULT 0,
  response_count integer NOT NULL DEFAULT 0,
  response_total_seconds bigint NOT NULL DEFAULT 0,
  organizer_intents_total integer NOT NULL DEFAULT 0,
  organizer_intents_completed integer NOT NULL DEFAULT 0,
  fulfilled_by_category jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_reputation_stats TO authenticated, anon;
GRANT ALL ON public.user_reputation_stats TO service_role;

ALTER TABLE public.user_reputation_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reputation stats are public read" ON public.user_reputation_stats;
CREATE POLICY "Reputation stats are public read"
  ON public.user_reputation_stats FOR SELECT
  USING (true);

-- Helper to upsert-and-increment
CREATE OR REPLACE FUNCTION public.rep_bump(
  _user_id uuid,
  _field text,
  _delta integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_reputation_stats(user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  EXECUTE format(
    'UPDATE public.user_reputation_stats SET %I = %I + $1, updated_at = now() WHERE user_id = $2',
    _field, _field
  ) USING _delta, _user_id;
END;$$;

CREATE OR REPLACE FUNCTION public.rep_bump_category(
  _user_id uuid,
  _category text,
  _delta integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_reputation_stats(user_id) VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_reputation_stats
     SET fulfilled_by_category = fulfilled_by_category
           || jsonb_build_object(
                _category,
                COALESCE((fulfilled_by_category->>_category)::int, 0) + _delta
              ),
         updated_at = now()
   WHERE user_id = _user_id;
END;$$;

-- ============================================================================
-- 2b. reputation_events (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  intent_id uuid REFERENCES public.intents(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reputation_events_user_created_idx
  ON public.reputation_events (user_id, created_at DESC);

GRANT SELECT ON public.reputation_events TO authenticated;
GRANT ALL ON public.reputation_events TO service_role;

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own reputation events" ON public.reputation_events;
CREATE POLICY "Users can read their own reputation events"
  ON public.reputation_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rep_log(
  _user_id uuid,
  _event_type text,
  _intent_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.reputation_events(user_id, event_type, intent_id, metadata)
  VALUES (_user_id, _event_type, _intent_id, COALESCE(_metadata, '{}'::jsonb));
$$;

-- ============================================================================
-- 2c. Triggers that maintain counters + event log
-- ============================================================================

-- Intents: created / status changes
CREATE OR REPLACE FUNCTION public.on_intent_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_organizer boolean;
BEGIN
  is_organizer := COALESCE(NEW.participation_mode = 'registration_first', false);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.rep_bump(NEW.creator_id, 'intents_created', 1);
    IF is_organizer THEN
      PERFORM public.rep_bump(NEW.creator_id, 'organizer_intents_total', 1);
    END IF;
    PERFORM public.rep_log(NEW.creator_id, 'intent_created', NEW.id,
      jsonb_build_object('category', NEW.category_slug));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'fulfilled' THEN
      PERFORM public.rep_bump(NEW.creator_id, 'intents_fulfilled', 1);
      PERFORM public.rep_bump_category(NEW.creator_id, NEW.category_slug, 1);
      IF is_organizer THEN
        PERFORM public.rep_bump(NEW.creator_id, 'organizer_intents_completed', 1);
      END IF;
      PERFORM public.rep_log(NEW.creator_id, 'intent_fulfilled', NEW.id,
        jsonb_build_object('category', NEW.category_slug));
    ELSIF NEW.status = 'closed' THEN
      PERFORM public.rep_bump(NEW.creator_id, 'intents_closed', 1);
      PERFORM public.rep_log(NEW.creator_id, 'intent_closed', NEW.id, '{}'::jsonb);
    ELSIF NEW.status = 'expired' THEN
      PERFORM public.rep_bump(NEW.creator_id, 'intents_expired', 1);
      PERFORM public.rep_log(NEW.creator_id, 'intent_expired', NEW.id, '{}'::jsonb);
    END IF;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_intent_reputation ON public.intents;
CREATE TRIGGER trg_intent_reputation
AFTER INSERT OR UPDATE ON public.intents
FOR EACH ROW EXECUTE FUNCTION public.on_intent_reputation();

-- Participants: interested → count for creator; confirmed → joined for creator + participant history
CREATE OR REPLACE FUNCTION public.on_participant_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_prior_joined int;
BEGIN
  SELECT creator_id INTO v_creator FROM public.intents WHERE id = NEW.intent_id;

  IF TG_OP = 'INSERT' THEN
    IF v_creator IS NOT NULL AND NEW.user_id <> v_creator THEN
      PERFORM public.rep_bump(v_creator, 'total_interested_received', 1);
      PERFORM public.rep_log(v_creator, 'participant_interested', NEW.intent_id,
        jsonb_build_object('user_id', NEW.user_id));
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.state = 'confirmed')
     OR (TG_OP = 'UPDATE' AND NEW.state = 'confirmed' AND OLD.state IS DISTINCT FROM 'confirmed') THEN
    IF v_creator IS NOT NULL AND NEW.user_id <> v_creator THEN
      PERFORM public.rep_bump(v_creator, 'total_joined_participants', 1);
      PERFORM public.rep_log(v_creator, 'participant_joined', NEW.intent_id,
        jsonb_build_object('user_id', NEW.user_id));

      -- Repeat participant: same user has confirmed on an earlier intent by same creator
      SELECT COUNT(*) INTO v_prior_joined
        FROM public.intent_participants p
        JOIN public.intents i ON i.id = p.intent_id
       WHERE i.creator_id = v_creator
         AND p.user_id = NEW.user_id
         AND p.state = 'confirmed'
         AND p.intent_id <> NEW.intent_id;
      IF v_prior_joined > 0 THEN
        PERFORM public.rep_bump(v_creator, 'repeat_participants', 1);
        PERFORM public.rep_log(v_creator, 'repeat_participant', NEW.intent_id,
          jsonb_build_object('user_id', NEW.user_id));
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_participant_reputation ON public.intent_participants;
CREATE TRIGGER trg_participant_reputation
AFTER INSERT OR UPDATE ON public.intent_participants
FOR EACH ROW EXECUTE FUNCTION public.on_participant_reputation();

-- Connections: accepted → +1 total_connections for both; repeat if they've had a prior accepted connection
CREATE OR REPLACE FUNCTION public.on_connection_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior int;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.state = 'accepted')
     OR (TG_OP = 'UPDATE' AND NEW.state = 'accepted' AND OLD.state IS DISTINCT FROM 'accepted') THEN

    PERFORM public.rep_bump(NEW.user_a, 'total_connections', 1);
    PERFORM public.rep_bump(NEW.user_b, 'total_connections', 1);
    PERFORM public.rep_log(NEW.user_a, 'connection_created', NEW.intent_id,
      jsonb_build_object('with', NEW.user_b));
    PERFORM public.rep_log(NEW.user_b, 'connection_created', NEW.intent_id,
      jsonb_build_object('with', NEW.user_a));

    -- Repeat connection: previously accepted connection between the same pair via a different intent
    -- (connections table is unique per pair, so we approximate via reputation_events history)
    SELECT COUNT(*) INTO v_prior
      FROM public.reputation_events e
     WHERE e.user_id = NEW.user_a
       AND e.event_type = 'connection_created'
       AND (e.metadata->>'with')::uuid = NEW.user_b
       AND e.intent_id IS DISTINCT FROM NEW.intent_id;
    IF v_prior > 1 THEN
      PERFORM public.rep_bump(NEW.user_a, 'repeat_connections', 1);
      PERFORM public.rep_bump(NEW.user_b, 'repeat_connections', 1);
    END IF;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_connection_reputation ON public.connections;
CREATE TRIGGER trg_connection_reputation
AFTER INSERT OR UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.on_connection_reputation();

-- Community: returning members = insert into community_member_history where the user had prior history in same community
CREATE OR REPLACE FUNCTION public.on_community_history_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_prior int;
BEGIN
  SELECT creator_id INTO v_creator FROM public.intents WHERE id = NEW.intent_id;
  IF v_creator IS NULL OR v_creator = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_prior
    FROM public.community_member_history h
   WHERE h.community_id = NEW.community_id
     AND h.user_id = NEW.user_id
     AND h.id <> NEW.id;
  IF v_prior > 0 THEN
    PERFORM public.rep_bump(v_creator, 'returning_members', 1);
    PERFORM public.rep_log(v_creator, 'community_member_returned', NEW.intent_id,
      jsonb_build_object('user_id', NEW.user_id, 'community_id', NEW.community_id));
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_community_history_reputation ON public.community_member_history;
CREATE TRIGGER trg_community_history_reputation
AFTER INSERT ON public.community_member_history
FOR EACH ROW EXECUTE FUNCTION public.on_community_history_reputation();

-- Response time: on first message by a thread member, if they're the creator of the intent tied to the thread,
-- measure seconds since thread creation and count it.
CREATE OR REPLACE FUNCTION public.on_message_reputation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_created timestamptz;
  v_intent_id uuid;
  v_creator uuid;
  v_prev_by_sender int;
  v_seconds bigint;
BEGIN
  SELECT t.created_at, t.intent_id INTO v_thread_created, v_intent_id
    FROM public.threads t WHERE t.id = NEW.thread_id;
  IF v_intent_id IS NULL THEN RETURN NEW; END IF;

  SELECT creator_id INTO v_creator FROM public.intents WHERE id = v_intent_id;
  IF v_creator IS NULL OR v_creator <> NEW.sender_id THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_prev_by_sender
    FROM public.messages m
   WHERE m.thread_id = NEW.thread_id
     AND m.sender_id = NEW.sender_id
     AND m.id <> NEW.id;
  IF v_prev_by_sender > 0 THEN RETURN NEW; END IF;

  v_seconds := GREATEST(0, EXTRACT(EPOCH FROM (NEW.created_at - v_thread_created))::bigint);
  PERFORM public.rep_bump(v_creator, 'response_count', 1);
  INSERT INTO public.user_reputation_stats(user_id) VALUES (v_creator) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_reputation_stats
     SET response_total_seconds = response_total_seconds + v_seconds,
         updated_at = now()
   WHERE user_id = v_creator;
  PERFORM public.rep_log(v_creator, 'response_sent', v_intent_id,
    jsonb_build_object('seconds', v_seconds));

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_message_reputation ON public.messages;
CREATE TRIGGER trg_message_reputation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_reputation();
