-- FIX: "new row violates row-level security policy for table threads" was
-- observed live when accepting a connection request (inbox.tsx inserts a
-- bare { kind: "dm" } row with no intent_id). The policy shipped in
-- 20260702075930 explicitly allows `intent_id IS NULL`, which should cover
-- this case -- if it's still failing live, the deployed policy has drifted
-- from what's in this migration history (a real risk, since we've already
-- confirmed git-pushed SQL migrations are not auto-applied by Lovable Cloud
-- and must be run manually). This migration re-asserts the intended policy
-- unconditionally, dropping every historical name this policy has had, so
-- the end state is correct regardless of what's actually live right now.

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
