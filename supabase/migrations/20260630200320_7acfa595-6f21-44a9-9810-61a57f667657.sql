
-- Pin search_path on remaining functions
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- Revoke direct EXECUTE on SECURITY DEFINER helpers — RLS policies still use them
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_intent_creator(UUID, UUID)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_thread_member(UUID, UUID)    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()              FROM PUBLIC, anon, authenticated;

-- Tighten threads INSERT policy (replace USING(true))
DROP POLICY "Authenticated can create threads" ON public.threads;
CREATE POLICY "Signed-in users can create threads"
  ON public.threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
