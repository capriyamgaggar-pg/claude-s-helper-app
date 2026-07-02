GRANT EXECUTE ON FUNCTION public.is_intent_creator(uuid, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_step_creator(uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_submission(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_creator(uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)   TO authenticated;