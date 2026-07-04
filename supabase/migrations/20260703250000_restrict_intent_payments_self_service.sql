-- FIX: "User manages own payment" was FOR ALL (SELECT/INSERT/UPDATE/DELETE)
-- scoped only to user_id = auth.uid(), with no restriction on which
-- columns could be touched. A separate "Creator updates payments" policy
-- existed alongside it, but multiple permissive policies for the same
-- command are combined with OR in Postgres RLS -- so the broad self policy
-- already granted a user full UPDATE rights on their own row regardless,
-- letting them set status = 'verified' (and verified_by/verified_at)
-- themselves, completely bypassing the creator's verification step.
--
-- Fix: split the self-service policy into SELECT/INSERT/DELETE only --
-- explicitly no general self UPDATE capability. A user can submit their
-- payment info and read/withdraw it, but the only way status/verified_by/
-- verified_at can ever change is through "Creator updates payments"
-- (unchanged, already correctly creator-only). If someone needs to fix a
-- typo in their reference before verification, they delete and resubmit
-- rather than edit in place -- deletion is blocked once verified, to
-- preserve an audit trail.

DROP POLICY IF EXISTS "User manages own payment" ON public.intent_payments;

CREATE POLICY "User reads own payment"
  ON public.intent_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User submits own payment"
  ON public.intent_payments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'submitted'
    AND verified_by IS NULL
    AND verified_at IS NULL
  );

CREATE POLICY "User withdraws own unverified payment"
  ON public.intent_payments FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status <> 'verified');
