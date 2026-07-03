-- Database-level enforcement that an intent's creator can never have an
-- intent_participants row for their own intent (self-interest/self-join).
-- The register.tsx page guard stops this through normal app usage, but
-- that's client-side only -- this closes it at the data layer too, so it
-- can't happen via a direct API call, a future code path that forgets the
-- check, or manual data entry.

CREATE OR REPLACE FUNCTION public.prevent_self_participation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = (SELECT creator_id FROM public.intents WHERE id = NEW.intent_id) THEN
    RAISE EXCEPTION 'An intent creator cannot be a participant on their own intent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_participation ON public.intent_participants;
CREATE TRIGGER trg_prevent_self_participation
  BEFORE INSERT OR UPDATE ON public.intent_participants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_participation();
