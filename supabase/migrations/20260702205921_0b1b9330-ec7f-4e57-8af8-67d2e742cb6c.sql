DROP POLICY IF EXISTS "Authenticated can create threads" ON public.threads;
DROP POLICY IF EXISTS "Signed-in users can create threads" ON public.threads;
DROP POLICY IF EXISTS "Users create allowed threads" ON public.threads;

CREATE POLICY "Users create allowed threads"
ON public.threads FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    intent_id IS NULL
    OR public.is_intent_creator(intent_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.intent_participants p
      WHERE p.intent_id = threads.intent_id
        AND p.user_id = auth.uid()
        AND p.state IN ('interested','joining','confirmed')
    )
  )
);