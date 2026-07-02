
CREATE POLICY "Participants can view their intents"
  ON public.intents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intent_participants p
       WHERE p.intent_id = intents.id
         AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can view community intents"
  ON public.intents FOR SELECT TO authenticated
  USING (
    community_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.community_members cm
       WHERE cm.community_id = intents.community_id
         AND cm.user_id = auth.uid()
    )
  );
