-- FIX: A prior security-hardening pass revoked EXECUTE on several
-- SECURITY DEFINER helper functions from `authenticated`. These functions
-- are called from *inside* RLS USING/WITH CHECK expressions (on
-- intent_participants, threads, thread_members, messages, intent_fulfillments,
-- journey_progress, intent_payments, intent_views, journey_form_answers, and
-- more). Postgres requires the querying role to hold EXECUTE on any function
-- invoked while evaluating a policy for that role's query -- SECURITY DEFINER
-- only changes whose privileges the function *body* runs with, it does not
-- waive the caller's need for EXECUTE. Revoking these broke RLS evaluation
-- app-wide (403 "permission denied for function ..." surfaced by PostgREST),
-- not just on the home feed.
--
-- These functions only ever return a boolean (e.g. "is this uid the
-- creator/member of this row?") and never expose row contents beyond what
-- the caller could already determine via existing SELECT policies, so
-- re-granting EXECUTE to authenticated is safe.

GRANT EXECUTE ON FUNCTION public.is_intent_creator(uuid, uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid, uuid)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_step_creator(uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_submission(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_creator(uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)   TO authenticated;
