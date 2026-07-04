CREATE TABLE public.blocked_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own blocks"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
CREATE POLICY "Users create their own blocks"
  ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Users remove their own blocks"
  ON public.blocked_users FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_blocked(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = a AND blocked_id = b) OR (blocker_id = b AND blocked_id = a)
  );
$$;
REVOKE ALL ON FUNCTION public.is_blocked(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID) TO authenticated;

CREATE TYPE public.report_reason AS ENUM (
  'harassment', 'inappropriate_content', 'safety_concern', 'spam', 'scam_or_fraud', 'other'
);
CREATE TYPE public.report_status AS ENUM ('open', 'reviewed', 'actioned', 'dismissed');

CREATE TABLE public.reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason            public.report_reason NOT NULL,
  details           TEXT,
  intent_id         UUID REFERENCES public.intents(id) ON DELETE SET NULL,
  thread_id         UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  status            public.report_status NOT NULL DEFAULT 'open',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id)
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT UPDATE (status) ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters see their own reports, admins see all"
  ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users file reports as themselves"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins can update report status"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members can send messages as themselves" ON public.messages;
CREATE POLICY "Members can send messages as themselves"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_thread_member(thread_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.thread_members tm
      WHERE tm.thread_id = messages.thread_id
        AND tm.user_id <> auth.uid()
        AND public.is_blocked(auth.uid(), tm.user_id)
    )
  );

DROP POLICY IF EXISTS "Either party can insert a connection" ON public.connections;
CREATE POLICY "Either party can insert a connection"
  ON public.connections FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (user_a, user_b)
    AND auth.uid() = requested_by
    AND NOT public.is_blocked(user_a, user_b)
  );