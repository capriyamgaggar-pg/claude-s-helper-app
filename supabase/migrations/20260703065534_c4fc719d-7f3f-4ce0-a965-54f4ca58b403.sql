DROP POLICY IF EXISTS "Either party can update state" ON public.connections;
REVOKE UPDATE ON public.connections FROM authenticated;
REVOKE SELECT ON public.user_reputation_stats FROM anon;