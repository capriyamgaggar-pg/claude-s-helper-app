-- FIX: the previous migration (20260703080000) did REVOKE UPDATE ON
-- connections FROM authenticated entirely, to stop users from directly
-- self-approving a connection. That broke something else: sending a
-- connect request uses upsert() (INSERT ... ON CONFLICT DO UPDATE), and
-- Postgres requires UPDATE privilege for any query containing an
-- ON CONFLICT DO UPDATE clause -- even runs that only ever insert -- the
-- check is based on query structure, not the runtime outcome. So every
-- connect-request send started failing with 403, not just direct
-- self-approval attempts.
--
-- Correct, narrower fix: restore UPDATE, but scope it two ways instead of
-- an all-or-nothing revoke:
--   1) Column-level: authenticated can update state/requested_by/intent_id/
--      origin_category/origin_city, but never thread_id directly -- only
--      accept_connection() (SECURITY DEFINER, bypasses grants) can set that.
--   2) Row-level: WITH CHECK blocks the resulting state from ever being
--      'accepted' via a direct client update, closing the self-approval
--      gap while leaving legitimate 'requested' upserts untouched.

GRANT UPDATE (state, requested_by, intent_id, origin_category, origin_city)
  ON public.connections TO authenticated;

DROP POLICY IF EXISTS "Either party can update state" ON public.connections;
CREATE POLICY "Either party can update to non-accepted state"
  ON public.connections FOR UPDATE TO authenticated
  USING (auth.uid() IN (user_a, user_b))
  WITH CHECK (auth.uid() IN (user_a, user_b) AND state <> 'accepted');
