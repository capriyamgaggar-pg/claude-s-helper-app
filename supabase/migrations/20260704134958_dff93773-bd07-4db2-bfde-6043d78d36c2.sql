DROP POLICY IF EXISTS "Users update their own participant state, creator can update any" ON public.intent_participants;
CREATE POLICY "Users update their own participant state, creator can update any"
  ON public.intent_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_intent_creator(intent_id, auth.uid()))
  WITH CHECK (
    (
      user_id = auth.uid() AND (
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

DROP POLICY IF EXISTS "Users add themselves as participant" ON public.intent_participants;
CREATE POLICY "Users add themselves as participant"
  ON public.intent_participants FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_id = auth.uid() AND (
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