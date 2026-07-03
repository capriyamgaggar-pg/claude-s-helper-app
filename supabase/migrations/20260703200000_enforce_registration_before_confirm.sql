-- Database-level enforcement, matching prevent_self_participation's pattern:
-- for intents set to participation_mode = 'registration_first', a
-- participant cannot be confirmed (state -> 'confirmed') unless they have
-- an actual submitted registration form. The chat's Approve button now
-- checks this client-side too, but that alone isn't enough -- this closes
-- it at the data layer so it can't be bypassed via Responses page approve,
-- a direct API call, or any future code path.

CREATE OR REPLACE FUNCTION public.enforce_registration_before_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_journey_id uuid;
  v_step_id uuid;
  v_submitted boolean;
BEGIN
  IF NEW.state = 'confirmed' AND (OLD IS NULL OR OLD.state IS DISTINCT FROM 'confirmed') THEN
    SELECT participation_mode INTO v_mode FROM public.intents WHERE id = NEW.intent_id;
    IF v_mode = 'registration_first' THEN
      SELECT id INTO v_journey_id FROM public.intent_journeys WHERE intent_id = NEW.intent_id;
      IF v_journey_id IS NOT NULL THEN
        SELECT id INTO v_step_id FROM public.journey_steps
          WHERE journey_id = v_journey_id AND type = 'registration_form';
        IF v_step_id IS NOT NULL THEN
          SELECT EXISTS(
            SELECT 1 FROM public.journey_form_submissions
            WHERE step_id = v_step_id AND participant_id = NEW.user_id AND status = 'submitted'
          ) INTO v_submitted;
          IF NOT v_submitted THEN
            RAISE EXCEPTION 'This intent requires registration before a participant can be confirmed';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_registration_before_confirm ON public.intent_participants;
CREATE TRIGGER trg_enforce_registration_before_confirm
  BEFORE INSERT OR UPDATE ON public.intent_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_registration_before_confirm();
