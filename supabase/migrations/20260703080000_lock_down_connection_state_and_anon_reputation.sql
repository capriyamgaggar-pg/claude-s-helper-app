-- FIX (Critical): "Any connection party can set the connection to accepted"
--
-- The UPDATE policy on connections let either party directly set state to
-- 'accepted' (and thread_id to anything) via a raw table update, completely
-- bypassing accept_connection()'s validation. In practice this meant a user
-- could self-approve their own outgoing request. accept_connection() is
-- SECURITY DEFINER and does not need table-level UPDATE grant to function,
-- so we remove direct UPDATE entirely -- all state transitions to
-- 'accepted' must go through that function. Only the client-side
-- insert/upsert of new 'requested' rows (used to send a request) still
-- needs INSERT, which is unaffected.

DROP POLICY IF EXISTS "Either party can update state" ON public.connections;
REVOKE UPDATE ON public.connections FROM authenticated;

-- FIX (Warning): reputation stats are intentionally public-facing (shown on
-- every profile page), so authenticated read access is correct and by
-- design. But they were also granted to `anon`, which serves no purpose --
-- this app has no logged-out browsing at all (every route requires auth).
-- Removing the unused anon grant has zero effect on real usage.

REVOKE SELECT ON public.user_reputation_stats FROM anon;
