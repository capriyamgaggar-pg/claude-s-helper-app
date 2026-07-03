-- FIX: "permission denied for table connections" when clicking Connect /
-- Request to Connect. These all use upsert() with onConflict on
-- (user_a, user_b). PostgREST's generated SQL for an upsert includes
-- user_a/user_b in the UPDATE ... SET clause even though their values
-- never actually change on conflict -- Postgres still checks UPDATE
-- privilege on every column referenced there. The earlier column-
-- restricted grant (state, requested_by, intent_id, origin_category,
-- origin_city) never included user_a/user_b, so every upsert-based
-- connect attempt has been failing since that fix went live.
--
-- Adding user_a/user_b to the allowed UPDATE columns is safe: WITH CHECK
-- still requires auth.uid() IN (user_a, user_b) and state <> 'accepted',
-- so this doesn't reopen the self-approval gap that fix was closing --
-- it only lets the redundant "set to the same value" part of an upsert
-- actually succeed.

GRANT UPDATE (user_a, user_b, state, requested_by, intent_id, origin_category, origin_city)
  ON public.connections TO authenticated;
