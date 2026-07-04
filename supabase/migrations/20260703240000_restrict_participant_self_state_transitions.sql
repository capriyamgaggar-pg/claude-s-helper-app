-- FIX (corrected): the intent_participants UPDATE policy let a participant
-- set their own row's state to ANYTHING, including 'confirmed', with zero
-- organizer involvement -- bypassing mutual-confirm entirely. But a
-- participant self-confirming IS legitimate for 'open_join' intents (that
-- mode exists specifically so people can join without approval) -- see
-- participation-card.tsx's request() mutation, which sets state directly
-- to 'confirmed' for open_join. A blanket "participants can never set
-- confirmed" rule would have broken that real, intended flow.
--
-- Correct rule: a participant can set their own row to 'interested',
-- 'joining', or 'left' freely (normal self-service), and can self-confirm
-- ONLY when the intent's join_mode is 'open_join'. For 'mutual_confirm'
-- intents, only the creator can ever move a row to 'confirmed' or
-- 'declined'.

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

-- Same gap existed on INSERT: a brand-new row could be inserted directly
-- as 'confirmed' for yourself, no prior row or approval needed at all.
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
