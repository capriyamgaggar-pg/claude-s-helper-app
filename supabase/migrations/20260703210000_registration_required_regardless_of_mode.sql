-- Widen enforce_registration_before_confirm(): a registration form, once
-- built for an intent, is required before confirming a participant
-- regardless of participation_mode. The mode only controls ordering (chat
-- vs. form first) -- not whether the form is ever mandatory. Previously
-- this only applied to participation_mode = 'registration_first', so a
-- conversation_first intent with a real form could still confirm someone
-- who never filled it in.

CREATE OR REPLACE FUNCTION public.enforce_registration_before_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey_id uuid;
  v_step_id uuid;
  v_submitted boolean;
BEGIN
  IF NEW.state = 'confirmed' AND (OLD IS NULL OR OLD.state IS DISTINCT FROM 'confirmed') THEN
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
          RAISE EXCEPTION 'This intent has a registration form that must be submitted before a participant can be confirmed';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
