-- FIX: infinite recursion detected in policy for relation "community_members"
--
-- community_members."Organizer sees community members" subqueries communities
-- (to check organizer_id), and communities."Members can read their community"
-- subqueries community_members (to check membership). Each policy's
-- evaluation depends on evaluating the other table's RLS, which depends on
-- evaluating the first again -- infinite recursion (Postgres error 42P17).
-- This existed since the communities feature was first added but was never
-- triggered by any live query path until today's new "Community members can
-- view community intents" policy on intents started touching
-- community_members directly.
--
-- Fix: use SECURITY DEFINER helper functions (same pattern as
-- is_intent_creator/is_thread_member elsewhere in this app) so membership/
-- organizer checks bypass RLS internally instead of re-triggering it.

CREATE OR REPLACE FUNCTION public.is_community_organizer(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = _community_id AND c.organizer_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_member(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members cm
    WHERE cm.community_id = _community_id AND cm.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_community_organizer(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_community_member(UUID, UUID)   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_community_organizer(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_member(UUID, UUID)   TO authenticated;

-- community_members: replace direct cross-table subquery with the helper
DROP POLICY IF EXISTS "Organizer sees community members" ON public.community_members;
CREATE POLICY "Organizer sees community members" ON public.community_members
  FOR SELECT TO authenticated
  USING (public.is_community_organizer(community_id, auth.uid()));

-- communities: replace direct cross-table subquery with the helper
DROP POLICY IF EXISTS "Members can read their community" ON public.communities;
CREATE POLICY "Members can read their community" ON public.communities
  FOR SELECT TO authenticated
  USING (public.is_community_member(id, auth.uid()));

-- intents: also route the community-intent-visibility check through the
-- same helper for consistency, avoiding any direct subquery into
-- community_members from a third table.
DROP POLICY IF EXISTS "Community members can view community intents" ON public.intents;
CREATE POLICY "Community members can view community intents" ON public.intents
  FOR SELECT TO authenticated
  USING (community_id IS NOT NULL AND public.is_community_member(community_id, auth.uid()));
