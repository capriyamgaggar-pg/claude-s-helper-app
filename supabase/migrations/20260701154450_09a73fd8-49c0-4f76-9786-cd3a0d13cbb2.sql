
REVOKE EXECUTE ON FUNCTION public.lock_intent_visibility(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rep_bump(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rep_bump_category(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rep_log(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_intent_participant_lock_visibility() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_form_submission_lock_visibility() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_connection_lock_visibility() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_intent_reputation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_participant_reputation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_connection_reputation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_community_history_reputation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_message_reputation() FROM PUBLIC, anon, authenticated;
