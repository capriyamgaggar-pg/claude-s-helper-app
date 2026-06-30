
-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'user');
CREATE TYPE public.participant_state AS ENUM ('interested', 'joining', 'confirmed', 'declined');
CREATE TYPE public.connection_state AS ENUM ('requested', 'accepted', 'declined');
CREATE TYPE public.thread_kind AS ENUM ('dm', 'intent');
CREATE TYPE public.intent_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.intent_status AS ENUM ('open', 'closed', 'completed', 'cancelled');

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  photo_url     TEXT,
  city          TEXT,
  profession    TEXT,
  bio           TEXT,
  languages     TEXT[] NOT NULL DEFAULT '{}',
  interests     TEXT[] NOT NULL DEFAULT '{}',
  linkedin_url  TEXT,
  instagram_url TEXT,
  onboarded     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- USER ROLES (separate table to prevent privilege escalation)
-- ============================================================================
CREATE TABLE public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- ============================================================================
-- handle_new_user trigger — create blank profile + default 'user' role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, photo_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- INTENT CATEGORIES (open-ended; new categories can be added without schema changes)
-- ============================================================================
CREATE TABLE public.intent_categories (
  slug  TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon  TEXT,
  sort  INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.intent_categories TO authenticated, anon;
GRANT ALL ON public.intent_categories TO service_role;
ALTER TABLE public.intent_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are public"
  ON public.intent_categories FOR SELECT TO authenticated, anon USING (true);

-- ============================================================================
-- INTENTS
-- ============================================================================
CREATE TABLE public.intents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category_slug   TEXT NOT NULL REFERENCES public.intent_categories(slug),
  city            TEXT,
  lat             NUMERIC(9,6),
  lng             NUMERIC(9,6),
  radius_km       INT NOT NULL DEFAULT 10,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  people_needed   INT NOT NULL DEFAULT 1,
  visibility      public.intent_visibility NOT NULL DEFAULT 'public',
  status          public.intent_status NOT NULL DEFAULT 'open',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intents TO authenticated;
GRANT ALL ON public.intents TO service_role;
ALTER TABLE public.intents ENABLE ROW LEVEL SECURITY;

CREATE INDEX intents_category_idx ON public.intents(category_slug);
CREATE INDEX intents_city_idx     ON public.intents(city);
CREATE INDEX intents_created_idx  ON public.intents(created_at DESC);
CREATE INDEX intents_creator_idx  ON public.intents(creator_id);

CREATE POLICY "Public intents are viewable by authenticated"
  ON public.intents FOR SELECT TO authenticated
  USING (visibility = 'public' OR creator_id = auth.uid());
CREATE POLICY "Users create their own intents"
  ON public.intents FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators update their own intents"
  ON public.intents FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators delete their own intents"
  ON public.intents FOR DELETE TO authenticated USING (creator_id = auth.uid());

CREATE TRIGGER intents_touch_updated
  BEFORE UPDATE ON public.intents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- INTENT PARTICIPANTS
-- ============================================================================
CREATE TABLE public.intent_participants (
  intent_id  UUID NOT NULL REFERENCES public.intents(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state      public.participant_state NOT NULL DEFAULT 'interested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (intent_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intent_participants TO authenticated;
GRANT ALL ON public.intent_participants TO service_role;
ALTER TABLE public.intent_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX intent_participants_user_idx ON public.intent_participants(user_id);

-- Security definer to check creator without recursion
CREATE OR REPLACE FUNCTION public.is_intent_creator(_intent_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.intents WHERE id = _intent_id AND creator_id = _user_id);
$$;

CREATE POLICY "Participants visible to self or intent creator"
  ON public.intent_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_intent_creator(intent_id, auth.uid()));
CREATE POLICY "Users add themselves as participant"
  ON public.intent_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update their own participant state, creator can update any"
  ON public.intent_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_intent_creator(intent_id, auth.uid()));
CREATE POLICY "Users remove their own participant row"
  ON public.intent_participants FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- CONNECTIONS (canonical ordered pair so each pair has at most one row)
-- ============================================================================
CREATE TABLE public.connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state        public.connection_state NOT NULL DEFAULT 'requested',
  intent_id    UUID REFERENCES public.intents(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connections visible to either party"
  ON public.connections FOR SELECT TO authenticated USING (auth.uid() IN (user_a, user_b));
CREATE POLICY "Either party can insert a connection"
  ON public.connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (user_a, user_b) AND auth.uid() = requested_by);
CREATE POLICY "Either party can update state"
  ON public.connections FOR UPDATE TO authenticated
  USING (auth.uid() IN (user_a, user_b)) WITH CHECK (auth.uid() IN (user_a, user_b));

CREATE TRIGGER connections_touch_updated
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- THREADS + MEMBERS + MESSAGES
-- ============================================================================
CREATE TABLE public.threads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       public.thread_kind NOT NULL DEFAULT 'dm',
  intent_id  UUID REFERENCES public.intents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO authenticated;
GRANT ALL ON public.threads TO service_role;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.thread_members (
  thread_id  UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_members TO authenticated;
GRANT ALL ON public.thread_members TO service_role;
ALTER TABLE public.thread_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX thread_members_user_idx ON public.thread_members(user_id);

-- Security definer: am I a member of this thread? (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_thread_member(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.thread_members WHERE thread_id = _thread_id AND user_id = _user_id);
$$;

CREATE POLICY "Members can view their threads"
  ON public.threads FOR SELECT TO authenticated
  USING (public.is_thread_member(id, auth.uid()));
CREATE POLICY "Authenticated can create threads"
  ON public.threads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Members can view thread membership"
  ON public.thread_members FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));
CREATE POLICY "Users can add themselves to a thread"
  ON public.thread_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id  UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX messages_thread_created_idx ON public.messages(thread_id, created_at);

CREATE POLICY "Members can read thread messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()));
CREATE POLICY "Members can send messages as themselves"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_thread_member(thread_id, auth.uid()));

-- Enable realtime on messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SEED CATEGORIES
-- ============================================================================
INSERT INTO public.intent_categories (slug, label, icon, sort) VALUES
  ('flatmate',    'Flatmate',        'home',         1),
  ('cofounder',   'Co-founder',      'rocket',       2),
  ('event',       'Event / Expo',    'calendar',     3),
  ('sports',      'Sports',          'activity',     4),
  ('trekking',    'Trekking',        'mountain',     5),
  ('travel',      'Travel buddy',    'plane',        6),
  ('shopping',    'Shopping',        'shopping-bag', 7),
  ('study',       'Study group',     'book-open',    8),
  ('networking',  'Networking',      'users',        9),
  ('hobby',       'Hobby',           'sparkles',    10),
  ('other',       'Other',           'compass',     99);
