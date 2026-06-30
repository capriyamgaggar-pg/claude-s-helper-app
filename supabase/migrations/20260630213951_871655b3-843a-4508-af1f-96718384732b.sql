
-- Add new columns to intents
ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_note text,
  ADD COLUMN IF NOT EXISTS closure_reason_code text,
  ADD COLUMN IF NOT EXISTS closure_reason_note text;

-- Constrain closure_reason_code
ALTER TABLE public.intents DROP CONSTRAINT IF EXISTS intents_closure_reason_code_check;
ALTER TABLE public.intents ADD CONSTRAINT intents_closure_reason_code_check
  CHECK (closure_reason_code IS NULL OR closure_reason_code IN
    ('found_elsewhere','no_longer_needed','not_enough_responses','wrong_timing','other'));

-- Migrate legacy statuses
UPDATE public.intents SET status='active'    WHERE status='open';
UPDATE public.intents SET status='fulfilled' WHERE status='completed';
UPDATE public.intents SET status='closed'    WHERE status='cancelled';

-- Backfill expires_at: 24h after creation for active rows without one; far past for terminal rows
UPDATE public.intents
SET expires_at = COALESCE(expires_at, created_at + interval '24 hours')
WHERE expires_at IS NULL;

-- Now require expires_at and set default
ALTER TABLE public.intents
  ALTER COLUMN expires_at SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

-- Default status for new rows
ALTER TABLE public.intents ALTER COLUMN status SET DEFAULT 'active'::public.intent_status;

-- Discovery index
CREATE INDEX IF NOT EXISTS intents_status_expires_idx
  ON public.intents (status, expires_at DESC);

-- ---------------------------------------------------------------------------
-- intent_fulfillments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.intent_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intent_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_fulfillments TO authenticated;
GRANT ALL ON public.intent_fulfillments TO service_role;

ALTER TABLE public.intent_fulfillments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator manages fulfillments" ON public.intent_fulfillments;
CREATE POLICY "Creator manages fulfillments"
  ON public.intent_fulfillments
  FOR ALL TO authenticated
  USING (public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (public.is_intent_creator(intent_id, auth.uid()));

DROP POLICY IF EXISTS "Creator and credited see fulfillments" ON public.intent_fulfillments;
CREATE POLICY "Creator and credited see fulfillments"
  ON public.intent_fulfillments
  FOR SELECT TO authenticated
  USING (public.is_intent_creator(intent_id, auth.uid()) OR user_id = auth.uid());

CREATE INDEX IF NOT EXISTS intent_fulfillments_intent_idx ON public.intent_fulfillments(intent_id);
CREATE INDEX IF NOT EXISTS intent_fulfillments_user_idx ON public.intent_fulfillments(user_id);

-- ---------------------------------------------------------------------------
-- Hourly expiry job: flip status + notify creator once
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_intents_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, creator_id, title
    FROM public.intents
    WHERE status = 'active' AND expires_at < now()
  LOOP
    UPDATE public.intents SET status = 'expired' WHERE id = r.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      r.creator_id,
      'intent_expired',
      'Your intent expired',
      'Did "' || r.title || '" work out?',
      jsonb_build_object('intent_id', r.id)
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_intents_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_intents_job() TO service_role;
