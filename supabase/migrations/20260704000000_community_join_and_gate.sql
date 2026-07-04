-- Communities existed only at the schema level -- no way to actually join
-- one (no INSERT policy on community_members at all), no way to leave, and
-- no connection between community membership and intent join eligibility.
-- This adds all three, plus the "members only" join gate this was built
-- for: an intent can be visible to everyone, but joining it can require
-- being a member of its linked community.

-- Joining: knowing a community's id functions as the invite (ids are
-- unguessable UUIDs, shared via a direct link -- same pattern already
-- used for "unlisted" style access elsewhere in this app).
CREATE POLICY "Users join a community by id"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users leave a community"
  ON public.community_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Gate: if an intent is linked to a community, only members (or the
-- intent's own creator) can have an intent_participants row created for
-- them at all -- applies regardless of join_mode, on top of the existing
-- self-state restrictions from the previous migration.
CREATE OR REPLACE FUNCTION public.can_join_intent(_intent_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    i.community_id IS NULL
    OR i.creator_id = _user_id
    OR public.is_community_member(i.community_id, _user_id)
  FROM public.intents i
  WHERE i.id = _intent_id;
$$;
REVOKE ALL ON FUNCTION public.can_join_intent(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_join_intent(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "Users add themselves as participant" ON public.intent_participants;
CREATE POLICY "Users add themselves as participant"
  ON public.intent_participants FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_id = auth.uid()
      AND public.can_join_intent(intent_id, auth.uid())
      AND (
        state IN ('interested', 'joining', 'left')
        OR (
          state = 'confirmed'
          AND EXISTS (
            SELECT 1 FROM public.intents i
            WHERE i.id = intent_participants.intent_id AND i.join_mode = 'open_join'
          )
        )
      )
    )
    OR public.is_intent_creator(intent_id, auth.uid())
  );
