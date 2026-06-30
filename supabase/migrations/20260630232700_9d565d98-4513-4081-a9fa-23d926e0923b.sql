
ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS participation_mode text NOT NULL DEFAULT 'conversation_first'
    CHECK (participation_mode IN ('conversation_first','registration_first')),
  ADD COLUMN IF NOT EXISTS community_id uuid,
  ADD COLUMN IF NOT EXISTS payment_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_inr integer,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS group_discussion_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS pincode text;

ALTER TYPE public.thread_kind ADD VALUE IF NOT EXISTS 'intent_group';

CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer manages own community" ON public.communities
  FOR ALL TO authenticated USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer sees community members" ON public.community_members
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.organizer_id = auth.uid())
  );
CREATE POLICY "Member sees own membership" ON public.community_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members can read their community" ON public.communities
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = communities.id AND cm.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.community_member_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_cmh_community ON public.community_member_history(community_id);
CREATE INDEX IF NOT EXISTS idx_cmh_user ON public.community_member_history(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_member_history TO authenticated;
GRANT ALL ON public.community_member_history TO service_role;
ALTER TABLE public.community_member_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer reads own history" ON public.community_member_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.organizer_id = auth.uid())
  );
CREATE POLICY "User reads own history" ON public.community_member_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.community_answers (
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id, field_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_answers TO authenticated;
GRANT ALL ON public.community_answers TO service_role;
ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own answers" ON public.community_answers
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Organizer reads community answers" ON public.community_answers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.organizer_id = auth.uid())
  );

ALTER TABLE public.intents
  ADD CONSTRAINT intents_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.intent_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL UNIQUE REFERENCES public.intents(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_journeys TO authenticated;
GRANT ALL ON public.intent_journeys TO service_role;
ALTER TABLE public.intent_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads journeys" ON public.intent_journeys
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creator manages own journey" ON public.intent_journeys
  FOR ALL TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (public.is_intent_creator(intent_id, auth.uid()));
CREATE TRIGGER trg_intent_journeys_updated BEFORE UPDATE ON public.intent_journeys
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.journey_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.intent_journeys(id) ON DELETE CASCADE,
  position integer NOT NULL,
  type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_js_journey ON public.journey_steps(journey_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_steps TO authenticated;
GRANT ALL ON public.journey_steps TO service_role;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads steps" ON public.journey_steps
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creator manages steps" ON public.journey_steps
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.intent_journeys ij WHERE ij.id = journey_id AND public.is_intent_creator(ij.intent_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.intent_journeys ij WHERE ij.id = journey_id AND public.is_intent_creator(ij.intent_id, auth.uid()))
  );

CREATE TABLE IF NOT EXISTS public.journey_step_config (
  step_id uuid PRIMARY KEY REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_step_config TO authenticated;
GRANT ALL ON public.journey_step_config TO service_role;
ALTER TABLE public.journey_step_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads config" ON public.journey_step_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creator manages config" ON public.journey_step_config
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.journey_steps js JOIN public.intent_journeys ij ON ij.id = js.journey_id WHERE js.id = step_id AND public.is_intent_creator(ij.intent_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.journey_steps js JOIN public.intent_journeys ij ON ij.id = js.journey_id WHERE js.id = step_id AND public.is_intent_creator(ij.intent_id, auth.uid()))
  );

CREATE TABLE IF NOT EXISTS public.journey_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.journey_steps(id) ON DELETE CASCADE,
  step_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','rejected')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (step_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_jp_intent_user ON public.journey_progress(intent_id, user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_progress TO authenticated;
GRANT ALL ON public.journey_progress TO service_role;
ALTER TABLE public.journey_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own progress" ON public.journey_progress
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Creator reads all progress" ON public.journey_progress
  FOR SELECT TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()));
CREATE POLICY "Creator updates progress" ON public.journey_progress
  FOR UPDATE TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (public.is_intent_creator(intent_id, auth.uid()));
CREATE TRIGGER trg_jp_updated BEFORE UPDATE ON public.journey_progress
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.intent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_inr integer NOT NULL,
  reference text,
  screenshot_path text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','verified','rejected')),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intent_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_payments TO authenticated;
GRANT ALL ON public.intent_payments TO service_role;
ALTER TABLE public.intent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own payment" ON public.intent_payments
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Creator reads payments" ON public.intent_payments
  FOR SELECT TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()));
CREATE POLICY "Creator updates payments" ON public.intent_payments
  FOR UPDATE TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (public.is_intent_creator(intent_id, auth.uid()));
CREATE TRIGGER trg_ipay_updated BEFORE UPDATE ON public.intent_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.intent_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intent_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_approvals TO authenticated;
GRANT ALL ON public.intent_approvals TO service_role;
ALTER TABLE public.intent_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own approval" ON public.intent_approvals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "User creates own approval row" ON public.intent_approvals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Creator manages approvals" ON public.intent_approvals
  FOR ALL TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (public.is_intent_creator(intent_id, auth.uid()));
CREATE TRIGGER trg_iapp_updated BEFORE UPDATE ON public.intent_approvals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.intent_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_iv_intent ON public.intent_views(intent_id);
GRANT SELECT, INSERT ON public.intent_views TO authenticated;
GRANT ALL ON public.intent_views TO service_role;
ALTER TABLE public.intent_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated logs view" ON public.intent_views
  FOR INSERT TO authenticated WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());
CREATE POLICY "Creator reads views" ON public.intent_views
  FOR SELECT TO authenticated USING (public.is_intent_creator(intent_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.journey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text,
  name text NOT NULL,
  description text,
  "group" text NOT NULL,
  scope text NOT NULL DEFAULT 'system' CHECK (scope IN ('system','organizer')),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source_intent_id uuid REFERENCES public.intents(id) ON DELETE SET NULL,
  recommended_mode text NOT NULL DEFAULT 'registration_first'
    CHECK (recommended_mode IN ('conversation_first','registration_first')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_jt_scope_slug ON public.journey_templates(scope, slug) WHERE slug IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_templates TO authenticated;
GRANT ALL ON public.journey_templates TO service_role;
ALTER TABLE public.journey_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read system templates" ON public.journey_templates
  FOR SELECT TO authenticated USING (scope = 'system');
CREATE POLICY "Owner manages own templates" ON public.journey_templates
  FOR ALL TO authenticated USING (scope = 'organizer' AND owner_id = auth.uid())
  WITH CHECK (scope = 'organizer' AND owner_id = auth.uid());
CREATE TRIGGER trg_jt_updated BEFORE UPDATE ON public.journey_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.journey_template_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.journey_templates(id) ON DELETE CASCADE,
  position integer NOT NULL,
  type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_jts_template ON public.journey_template_steps(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journey_template_steps TO authenticated;
GRANT ALL ON public.journey_template_steps TO service_role;
ALTER TABLE public.journey_template_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read steps for visible templates" ON public.journey_template_steps
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.journey_templates jt WHERE jt.id = template_id AND (jt.scope='system' OR jt.owner_id = auth.uid()))
  );
CREATE POLICY "Owner manages own template steps" ON public.journey_template_steps
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.journey_templates jt WHERE jt.id = template_id AND jt.scope='organizer' AND jt.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.journey_templates jt WHERE jt.id = template_id AND jt.scope='organizer' AND jt.owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.handle_participant_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_community_id uuid;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.state = 'confirmed')
     OR (TG_OP = 'UPDATE' AND NEW.state = 'confirmed' AND OLD.state IS DISTINCT FROM 'confirmed') THEN
    SELECT community_id INTO v_community_id FROM public.intents WHERE id = NEW.intent_id;
    IF v_community_id IS NOT NULL THEN
      INSERT INTO public.community_members (community_id, user_id)
        VALUES (v_community_id, NEW.user_id) ON CONFLICT DO NOTHING;
      INSERT INTO public.community_member_history (community_id, user_id, intent_id, joined_at)
        VALUES (v_community_id, NEW.user_id, NEW.intent_id, COALESCE(NEW.joined_at, now()));
    END IF;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_participant_confirmed ON public.intent_participants;
CREATE TRIGGER trg_participant_confirmed AFTER INSERT OR UPDATE OF state ON public.intent_participants
  FOR EACH ROW EXECUTE FUNCTION public.handle_participant_confirmed();

CREATE OR REPLACE FUNCTION public.handle_intent_closed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('fulfilled','closed','expired','completed','cancelled')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.community_member_history SET completed_at = now()
      WHERE intent_id = NEW.id AND completed_at IS NULL;
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_intent_closed ON public.intents;
CREATE TRIGGER trg_intent_closed AFTER UPDATE OF status ON public.intents
  FOR EACH ROW EXECUTE FUNCTION public.handle_intent_closed();

CREATE POLICY "Users upload own registration files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'registration-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own registration files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'registration-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Intent creators read participant files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'registration-uploads' AND EXISTS (
    SELECT 1 FROM public.intent_payments p WHERE p.screenshot_path = name AND public.is_intent_creator(p.intent_id, auth.uid())
  ));

INSERT INTO public.journey_templates (slug, name, description, "group", scope, recommended_mode) VALUES
  ('blank', 'Blank', 'Start from scratch', 'Blank', 'system', 'registration_first'),
  ('weekend-trek', 'Weekend Trek', 'Registration + payment + approval for treks', 'Adventure', 'system', 'registration_first'),
  ('camping', 'Camping Trip', 'Registration + emergency contact', 'Adventure', 'system', 'registration_first'),
  ('cycling', 'Cycling Ride', 'Quick registration for group rides', 'Adventure', 'system', 'registration_first'),
  ('workshop', 'Workshop', 'Registration + payment', 'Business', 'system', 'registration_first'),
  ('meetup', 'Meetup', 'Lightweight RSVP', 'Business', 'system', 'registration_first'),
  ('networking', 'Networking Event', 'Registration with company + role', 'Business', 'system', 'registration_first'),
  ('college-event', 'College Event', 'Registration with college ID', 'Education', 'system', 'registration_first'),
  ('hackathon', 'Hackathon', 'Team registration + approval', 'Education', 'system', 'registration_first'),
  ('volunteer-drive', 'Volunteer Drive', 'Registration + availability', 'Community', 'system', 'registration_first'),
  ('marathon', 'Marathon', 'Registration + payment + waiver acknowledgement', 'Sports', 'system', 'registration_first'),
  ('sports-tournament', 'Sports Tournament', 'Team registration + payment', 'Sports', 'system', 'registration_first');

DO $$
DECLARE
  t RECORD;
  basic_form jsonb := jsonb_build_object('title','Registration','fields', jsonb_build_array(
    jsonb_build_object('key','full_name','label','Full name','type','text','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','phone','label','Phone','type','phone','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','email','label','Email','type','email','required',true,'autofill_scope','profile')
  ));
  trek_form jsonb := jsonb_build_object('title','Trek Registration','fields', jsonb_build_array(
    jsonb_build_object('key','full_name','label','Full name','type','text','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','phone','label','Phone','type','phone','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','dob','label','Date of birth','type','date','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','blood_group','label','Blood group','type','select','options', jsonb_build_array('A+','A-','B+','B-','AB+','AB-','O+','O-'),'required',true,'autofill_scope','profile'),
    jsonb_build_object('key','emergency_contact_name','label','Emergency contact name','type','text','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','emergency_contact_phone','label','Emergency contact phone','type','phone','required',true,'autofill_scope','profile'),
    jsonb_build_object('key','fitness_level','label','Fitness level','type','select','options', jsonb_build_array('Beginner','Intermediate','Advanced'),'required',true,'autofill_scope','community')
  ));
  payment_cfg jsonb := jsonb_build_object('amount_inr',0,'instructions','Pay via UPI and upload screenshot.');
  approval_cfg jsonb := jsonb_build_object('instructions','Organizer will review and approve.');
BEGIN
  FOR t IN SELECT id, slug FROM public.journey_templates WHERE scope='system' LOOP
    IF t.slug = 'blank' THEN CONTINUE;
    ELSIF t.slug IN ('weekend-trek','camping','marathon') THEN
      INSERT INTO public.journey_template_steps (template_id, position, type, config) VALUES
        (t.id, 1, 'registration_form', trek_form),
        (t.id, 2, 'payment_manual', payment_cfg),
        (t.id, 3, 'approval_manual', approval_cfg);
    ELSIF t.slug IN ('workshop','networking','sports-tournament') THEN
      INSERT INTO public.journey_template_steps (template_id, position, type, config) VALUES
        (t.id, 1, 'registration_form', basic_form),
        (t.id, 2, 'payment_manual', payment_cfg);
    ELSIF t.slug IN ('hackathon','college-event') THEN
      INSERT INTO public.journey_template_steps (template_id, position, type, config) VALUES
        (t.id, 1, 'registration_form', basic_form),
        (t.id, 2, 'approval_manual', approval_cfg);
    ELSE
      INSERT INTO public.journey_template_steps (template_id, position, type, config) VALUES
        (t.id, 1, 'registration_form', basic_form);
    END IF;
  END LOOP;
END$$;
