
-- Enums
DO $$ BEGIN
  CREATE TYPE public.feedback_participate_again AS ENUM ('definitely','probably','maybe','probably_not','never');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.feedback_recommend AS ENUM ('definitely','probably','maybe','probably_not','never');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) intent_feedback
CREATE TABLE IF NOT EXISTS public.intent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  met_expectations int NOT NULL CHECK (met_expectations BETWEEN 1 AND 5),
  would_participate_again public.feedback_participate_again NOT NULL,
  would_recommend public.feedback_recommend,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intent_id, participant_id)
);
CREATE INDEX IF NOT EXISTS intent_feedback_intent_idx ON public.intent_feedback(intent_id);
CREATE INDEX IF NOT EXISTS intent_feedback_creator_idx ON public.intent_feedback(creator_id);

GRANT SELECT, INSERT ON public.intent_feedback TO authenticated;
GRANT ALL ON public.intent_feedback TO service_role;

ALTER TABLE public.intent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participant inserts own feedback"
  ON public.intent_feedback FOR INSERT TO authenticated
  WITH CHECK (
    participant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.intent_participants p
      WHERE p.intent_id = intent_feedback.intent_id
        AND p.user_id = auth.uid()
        AND p.state = 'confirmed'
    )
    AND EXISTS (
      SELECT 1 FROM public.intents i
      WHERE i.id = intent_feedback.intent_id
        AND i.status IN ('fulfilled','closed','expired')
        AND i.creator_id = intent_feedback.creator_id
    )
  );

CREATE POLICY "Participant reads own feedback"
  ON public.intent_feedback FOR SELECT TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Creator reads feedback on own intents"
  ON public.intent_feedback FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

-- 2) intent_feedback_requests
CREATE TABLE IF NOT EXISTS public.intent_feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_requested_at timestamptz NOT NULL DEFAULT now(),
  feedback_submitted_at timestamptz,
  UNIQUE (intent_id, participant_id)
);
CREATE INDEX IF NOT EXISTS intent_feedback_requests_intent_idx ON public.intent_feedback_requests(intent_id);
CREATE INDEX IF NOT EXISTS intent_feedback_requests_participant_idx ON public.intent_feedback_requests(participant_id);

GRANT SELECT ON public.intent_feedback_requests TO authenticated;
GRANT ALL ON public.intent_feedback_requests TO service_role;

ALTER TABLE public.intent_feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participant reads own feedback request"
  ON public.intent_feedback_requests FOR SELECT TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Creator reads feedback requests on own intents"
  ON public.intent_feedback_requests FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

-- 3) user_reputation_stats — new counters
ALTER TABLE public.user_reputation_stats
  ADD COLUMN IF NOT EXISTS feedback_received int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS met_expectations_sum int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS met_expectations_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_participate_again_definitely int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_participate_again_probably int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_participate_again_maybe int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_participate_again_probably_not int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_participate_again_never int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_recommend_definitely int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_recommend_probably int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_recommend_maybe int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_recommend_probably_not int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS would_recommend_never int NOT NULL DEFAULT 0;

-- 4) Trigger: on_feedback_insert
CREATE OR REPLACE FUNCTION public.on_feedback_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Stamp / upsert the request row for analytics
  INSERT INTO public.intent_feedback_requests(intent_id, participant_id, creator_id, feedback_requested_at, feedback_submitted_at)
  VALUES (NEW.intent_id, NEW.participant_id, NEW.creator_id, NEW.submitted_at, NEW.submitted_at)
  ON CONFLICT (intent_id, participant_id) DO UPDATE
    SET feedback_submitted_at = EXCLUDED.feedback_submitted_at;

  -- Bump raw stats on the creator
  INSERT INTO public.user_reputation_stats(user_id) VALUES (NEW.creator_id)
    ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_reputation_stats
     SET feedback_received = feedback_received + 1,
         met_expectations_sum = met_expectations_sum + NEW.met_expectations,
         met_expectations_count = met_expectations_count + 1,
         updated_at = now()
   WHERE user_id = NEW.creator_id;

  -- would_participate_again distribution
  EXECUTE format(
    'UPDATE public.user_reputation_stats SET %I = %I + 1, updated_at = now() WHERE user_id = $1',
    'would_participate_again_' || NEW.would_participate_again::text,
    'would_participate_again_' || NEW.would_participate_again::text
  ) USING NEW.creator_id;

  IF NEW.would_recommend IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.user_reputation_stats SET %I = %I + 1, updated_at = now() WHERE user_id = $1',
      'would_recommend_' || NEW.would_recommend::text,
      'would_recommend_' || NEW.would_recommend::text
    ) USING NEW.creator_id;
  END IF;

  -- Reputation event (no participant_id in metadata)
  PERFORM public.rep_log(
    NEW.creator_id, 'feedback_received', NEW.intent_id,
    jsonb_build_object(
      'met_expectations', NEW.met_expectations,
      'would_participate_again', NEW.would_participate_again::text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_feedback_insert ON public.intent_feedback;
CREATE TRIGGER trg_on_feedback_insert
AFTER INSERT ON public.intent_feedback
FOR EACH ROW EXECUTE FUNCTION public.on_feedback_insert();

-- 5) Trigger: on_intent_completed → fan out request rows + notifications
CREATE OR REPLACE FUNCTION public.on_intent_completed_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.status IN ('fulfilled','closed','expired')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR r IN
      SELECT user_id
      FROM public.intent_participants
      WHERE intent_id = NEW.id AND state = 'confirmed' AND user_id <> NEW.creator_id
    LOOP
      INSERT INTO public.intent_feedback_requests(intent_id, participant_id, creator_id)
      VALUES (NEW.id, r.user_id, NEW.creator_id)
      ON CONFLICT (intent_id, participant_id) DO NOTHING;

      INSERT INTO public.notifications(user_id, kind, payload)
      VALUES (
        r.user_id, 'feedback_requested',
        jsonb_build_object('intent_id', NEW.id, 'title', NEW.title)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_intent_completed_feedback ON public.intents;
CREATE TRIGGER trg_on_intent_completed_feedback
AFTER UPDATE ON public.intents
FOR EACH ROW EXECUTE FUNCTION public.on_intent_completed_feedback();
