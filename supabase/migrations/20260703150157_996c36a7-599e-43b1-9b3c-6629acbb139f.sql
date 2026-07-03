-- Tighten connections table RLS.
-- Remove overly-permissive SELECT and UPDATE policies that override the
-- correctly-scoped pair policies. Reads and updates already have narrower
-- policies that restrict to (user_a, user_b), and accept flow goes through
-- the accept_connection() SECURITY DEFINER function.

DROP POLICY IF EXISTS "connections_select_all" ON public.connections;
DROP POLICY IF EXISTS "connections_update_pair" ON public.connections;