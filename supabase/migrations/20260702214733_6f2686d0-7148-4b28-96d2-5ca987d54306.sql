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

DROP POLICY IF EXISTS "Organizer sees community members" ON public.community_members;
CREATE POLICY "Organizer sees community members" ON public.community_members
  FOR SELECT TO authenticated
  USING (public.is_community_organizer(community_id, auth.uid()));

DROP POLICY IF EXISTS "Members can read their community" ON public.communities;
CREATE POLICY "Members can read their community" ON public.communities
  FOR SELECT TO authenticated
  USING (public.is_community_member(id, auth.uid()));

DROP POLICY IF EXISTS "Community members can view community intents" ON public.intents;
CREATE POLICY "Community members can view community intents" ON public.intents
  FOR SELECT TO authenticated
  USING (community_id IS NOT NULL AND public.is_community_member(community_id, auth.uid()));