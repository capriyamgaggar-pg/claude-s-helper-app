CREATE POLICY "Users join a community by id"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users leave a community"
  ON public.community_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

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