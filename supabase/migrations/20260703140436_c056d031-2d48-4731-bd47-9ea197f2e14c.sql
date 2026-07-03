CREATE OR REPLACE FUNCTION public.get_response_counts_total()
RETURNS TABLE(intent_id uuid, total_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT i.id, count(s.id)::int
  FROM public.intents i
  JOIN public.journey_form_submissions s ON s.intent_id = i.id
  WHERE i.creator_id = auth.uid()
    AND s.status = 'submitted'
  GROUP BY i.id;
$function$;

CREATE OR REPLACE FUNCTION public.get_response_counts_pending()
RETURNS TABLE(intent_id uuid, new_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT i.id, count(s.id)::int
  FROM public.intents i
  JOIN public.journey_form_submissions s ON s.intent_id = i.id
  WHERE i.creator_id = auth.uid()
    AND s.status = 'submitted'
    AND s.submitted_at > i.responses_last_viewed_at
  GROUP BY i.id;
$function$;

REVOKE ALL ON FUNCTION public.get_response_counts_total() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_response_counts_pending() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_response_counts_total() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_response_counts_pending() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_response_counts_total() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_response_counts_pending() TO service_role;
