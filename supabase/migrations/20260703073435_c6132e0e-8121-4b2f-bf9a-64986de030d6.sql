GRANT UPDATE (state, requested_by, intent_id, origin_category, origin_city)
  ON public.connections TO authenticated;

DROP POLICY IF EXISTS "Either party can update state" ON public.connections;
CREATE POLICY "Either party can update to non-accepted state"
  ON public.connections FOR UPDATE TO authenticated
  USING (auth.uid() IN (user_a, user_b))
  WITH CHECK (auth.uid() IN (user_a, user_b) AND state <> 'accepted');