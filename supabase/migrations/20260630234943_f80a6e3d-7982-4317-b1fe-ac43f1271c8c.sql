
-- =========================================================
-- Milestone 2: Registration Form schema
-- =========================================================

-- 1. journey_form_fields ---------------------------------------------------
CREATE TABLE public.journey_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  section_id uuid NULL,                              -- reserved (repeating sections)
  kind text NOT NULL,                                -- includes 'section'
  label text NOT NULL,
  description text NULL,
  field_key text NULL,                               -- null for kind='section'
  required boolean NOT NULL DEFAULT false,
  placeholder text NULL,
  help_text text NULL,
  default_value jsonb NULL,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_fill jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_width text NOT NULL DEFAULT 'full',        -- full | half | third
  visible_if jsonb NULL,                             -- reserved
  organizer_only boolean NOT NULL DEFAULT false,     -- reserved
  sort integer NOT NULL DEFAULT 0,
  archived_at timestamptz NULL,
  archived_by uuid NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journey_form_fields_step_idx
  ON public.journey_form_fields(step_id, sort)
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX journey_form_fields_step_key_uidx
  ON public.journey_form_fields(step_id, field_key)
  WHERE field_key IS NOT NULL AND archived_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_form_fields TO authenticated;
GRANT ALL ON public.journey_form_fields TO service_role;

ALTER TABLE public.journey_form_fields ENABLE ROW LEVEL SECURITY;

-- Helper: is this step on an intent the user creates?
CREATE OR REPLACE FUNCTION public.is_step_creator(_step_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.journey_steps s
    JOIN public.intent_journeys j ON j.id = s.journey_id
    JOIN public.intents i        ON i.id = j.intent_id
    WHERE s.id = _step_id AND i.creator_id = _user_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_step_creator(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "form_fields_read_all_auth"
  ON public.journey_form_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "form_fields_creator_insert"
  ON public.journey_form_fields FOR INSERT
  TO authenticated
  WITH CHECK (public.is_step_creator(step_id, auth.uid()));

CREATE POLICY "form_fields_creator_update"
  ON public.journey_form_fields FOR UPDATE
  TO authenticated
  USING (public.is_step_creator(step_id, auth.uid()))
  WITH CHECK (public.is_step_creator(step_id, auth.uid()));

CREATE POLICY "form_fields_creator_delete"
  ON public.journey_form_fields FOR DELETE
  TO authenticated
  USING (public.is_step_creator(step_id, auth.uid()));

CREATE TRIGGER trg_form_fields_touch
  BEFORE UPDATE ON public.journey_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. journey_form_submissions ---------------------------------------------
CREATE TABLE public.journey_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL,                     -- auth.users.id
  form_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',             -- draft | submitted
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, participant_id)
);

CREATE INDEX journey_form_submissions_intent_idx
  ON public.journey_form_submissions(intent_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_form_submissions TO authenticated;
GRANT ALL ON public.journey_form_submissions TO service_role;

ALTER TABLE public.journey_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "form_subs_owner_select"
  ON public.journey_form_submissions FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR public.is_intent_creator(intent_id, auth.uid()));

CREATE POLICY "form_subs_owner_insert"
  ON public.journey_form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "form_subs_owner_update"
  ON public.journey_form_submissions FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "form_subs_owner_delete"
  ON public.journey_form_submissions FOR DELETE
  TO authenticated
  USING (participant_id = auth.uid());

CREATE TRIGGER trg_form_subs_touch
  BEFORE UPDATE ON public.journey_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. journey_form_answers --------------------------------------------------
CREATE TABLE public.journey_form_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.journey_form_submissions(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.journey_form_fields(id) ON DELETE RESTRICT,
  field_key text NULL,                              -- mirror for export friendliness
  value jsonb NULL,
  file_path text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, field_id)
);

CREATE INDEX journey_form_answers_submission_idx
  ON public.journey_form_answers(submission_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_form_answers TO authenticated;
GRANT ALL ON public.journey_form_answers TO service_role;

ALTER TABLE public.journey_form_answers ENABLE ROW LEVEL SECURITY;

-- Helper for answer access via submission ownership / intent creatorship
CREATE OR REPLACE FUNCTION public.can_access_submission(_submission_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.journey_form_submissions s
    WHERE s.id = _submission_id
      AND (s.participant_id = _user_id OR public.is_intent_creator(s.intent_id, _user_id))
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_access_submission(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "form_answers_access_select"
  ON public.journey_form_answers FOR SELECT
  TO authenticated
  USING (public.can_access_submission(submission_id, auth.uid()));

CREATE POLICY "form_answers_owner_insert"
  ON public.journey_form_answers FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journey_form_submissions s
    WHERE s.id = submission_id AND s.participant_id = auth.uid()
  ));

CREATE POLICY "form_answers_owner_update"
  ON public.journey_form_answers FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journey_form_submissions s
    WHERE s.id = submission_id AND s.participant_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journey_form_submissions s
    WHERE s.id = submission_id AND s.participant_id = auth.uid()
  ));

CREATE POLICY "form_answers_owner_delete"
  ON public.journey_form_answers FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journey_form_submissions s
    WHERE s.id = submission_id AND s.participant_id = auth.uid()
  ));

CREATE TRIGGER trg_form_answers_touch
  BEFORE UPDATE ON public.journey_form_answers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Form version bump trigger --------------------------------------------
-- Stored on journey_step_config.config->>'form_version'
CREATE OR REPLACE FUNCTION public.bump_form_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_id uuid;
  v_structural boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_step_id := NEW.step_id;
    v_structural := true;
  ELSIF TG_OP = 'DELETE' THEN
    v_step_id := OLD.step_id;
    v_structural := true;
  ELSE
    v_step_id := NEW.step_id;
    v_structural :=
         (OLD.kind         IS DISTINCT FROM NEW.kind)
      OR (OLD.required     IS DISTINCT FROM NEW.required)
      OR (OLD.validation   IS DISTINCT FROM NEW.validation)
      OR (OLD.field_key    IS DISTINCT FROM NEW.field_key)
      OR (OLD.sort         IS DISTINCT FROM NEW.sort)
      OR (OLD.archived_at  IS DISTINCT FROM NEW.archived_at);
  END IF;

  IF v_structural THEN
    INSERT INTO public.journey_step_config(step_id, config, updated_at)
    VALUES (
      v_step_id,
      jsonb_build_object('form_version', 2),
      now()
    )
    ON CONFLICT (step_id) DO UPDATE
      SET config = public.journey_step_config.config
                   || jsonb_build_object(
                        'form_version',
                        COALESCE((public.journey_step_config.config->>'form_version')::int, 1) + 1
                      ),
          updated_at = now();
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
GRANT EXECUTE ON FUNCTION public.bump_form_version() TO authenticated, service_role;

CREATE TRIGGER trg_bump_form_version
  AFTER INSERT OR UPDATE OR DELETE ON public.journey_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.bump_form_version();
