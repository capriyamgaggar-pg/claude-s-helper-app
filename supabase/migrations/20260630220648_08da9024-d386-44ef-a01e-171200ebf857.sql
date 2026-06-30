
-- 1. Extend participant_state enum
ALTER TYPE public.participant_state ADD VALUE IF NOT EXISTS 'left';

-- 2. Extend intent_participants with lifecycle metadata and optional interest message
ALTER TABLE public.intent_participants
  ADD COLUMN IF NOT EXISTS interest_message text,
  ADD COLUMN IF NOT EXISTS interest_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirm_initiated_by uuid,
  ADD COLUMN IF NOT EXISTS confirm_initiated_at timestamptz,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS left_at timestamptz;

ALTER TABLE public.intent_participants
  DROP CONSTRAINT IF EXISTS intent_participants_interest_message_len;
ALTER TABLE public.intent_participants
  ADD CONSTRAINT intent_participants_interest_message_len
  CHECK (interest_message IS NULL OR char_length(interest_message) <= 250);

-- 3. Add join_mode to intents
ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS join_mode text NOT NULL DEFAULT 'mutual_confirm';

ALTER TABLE public.intents
  DROP CONSTRAINT IF EXISTS intents_join_mode_check;
ALTER TABLE public.intents
  ADD CONSTRAINT intents_join_mode_check
  CHECK (join_mode IN ('mutual_confirm','open_join'));

-- 4. Extend connections with origin context (intent_id already exists)
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS origin_category text,
  ADD COLUMN IF NOT EXISTS origin_city text;
