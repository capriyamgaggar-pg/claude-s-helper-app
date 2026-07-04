-- Split the overly broad "User manages own payment" ALL policy so users
-- can no longer self-approve their own payment verification.
DROP POLICY IF EXISTS "User manages own payment" ON public.intent_payments;

CREATE POLICY "User reads own payment"
  ON public.intent_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User creates own payment"
  ON public.intent_payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User deletes own payment"
  ON public.intent_payments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "User updates own payment non-verification fields"
  ON public.intent_payments FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Belt-and-suspenders: even if a future policy allowed a user to UPDATE
-- their row, this trigger blocks any change to verification fields by
-- anyone other than the intent creator.
CREATE OR REPLACE FUNCTION public.guard_intent_payment_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
      OR NEW.verified_by IS DISTINCT FROM OLD.verified_by)
     AND NOT public.is_intent_creator(NEW.intent_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the intent creator can change payment verification fields';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_intent_payment_verification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_intent_payment_verification ON public.intent_payments;
CREATE TRIGGER trg_guard_intent_payment_verification
  BEFORE UPDATE ON public.intent_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_intent_payment_verification();