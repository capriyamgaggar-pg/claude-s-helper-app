-- Remove the duplicate/weaker INSERT policy that allows bypassing requested_by enforcement.
DROP POLICY IF EXISTS "connections_insert_pair" ON public.connections;

-- Revoke SELECT on the remaining sensitive PII column that authenticated users can still read.
REVOKE SELECT (place_id) ON public.profiles FROM authenticated;
