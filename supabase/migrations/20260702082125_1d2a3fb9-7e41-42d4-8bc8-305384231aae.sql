
-- 1) Restrict profiles: only owner can read full row; create safe public view for others
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, name, photo_url, bio, city, locality, state, country,
       profession, interests, languages, linkedin_url, instagram_url,
       onboarded, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- View bypasses per-column RLS but underlying table needs a policy allowing read of safe columns.
-- Add a policy that allows authenticated users to read profile rows (view exposes only safe columns).
CREATE POLICY "Authenticated can read profiles via public view"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Note: This second policy re-opens table SELECT. Replace approach: use SECURITY DEFINER view instead.
DROP POLICY "Authenticated can read profiles via public view" ON public.profiles;

-- Recreate view as SECURITY DEFINER so it bypasses RLS on profiles and only exposes safe columns.
DROP VIEW public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, name, photo_url, bio, city, locality, state, country,
       profession, interests, languages, linkedin_url, instagram_url,
       onboarded, created_at, updated_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL ON public.public_profiles FROM anon, public;

-- 2) thread_members INSERT: only allow if user is intent creator or a participant of the thread's intent
DROP POLICY IF EXISTS "Users can add themselves to a thread" ON public.thread_members;
CREATE POLICY "Users can join threads they belong to"
  ON public.thread_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = thread_members.thread_id
        AND (
          t.intent_id IS NULL
          OR public.is_intent_creator(t.intent_id, auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.intent_participants p
            WHERE p.intent_id = t.intent_id
              AND p.user_id = auth.uid()
              AND p.state IN ('interested','joining','confirmed')
          )
        )
    )
  );

-- 3) user_reputation_stats: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Reputation stats are public read" ON public.user_reputation_stats;
CREATE POLICY "Authenticated can read reputation stats"
  ON public.user_reputation_stats FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.user_reputation_stats FROM anon;

-- 4) Revoke EXECUTE on remaining SECURITY DEFINER helpers from anon/authenticated.
-- These are used only inside RLS policy expressions where Postgres evaluates them
-- with the policy owner's privileges, so revoking API-level EXECUTE is safe.
REVOKE EXECUTE ON FUNCTION public.can_access_submission(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.can_see_creator(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_intent_creator(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_step_creator(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_thread_member(uuid, uuid) FROM anon, authenticated, public;
