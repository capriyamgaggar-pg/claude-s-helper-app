-- Redefines get_new_response_counts() from "submitted after I last viewed
-- the page" (cleared just by opening it, even with nothing decided) to a
-- true total/pending model:
--   total   = every submission this intent has ever received
--   pending = submissions from people not yet approved or declined
-- Only approving or declining someone moves the pending count -- opening
-- the Responses page no longer affects it. responses_last_viewed_at is no
-- longer used by this function (left in place harmlessly in case it's
-- useful again later).

CREATE OR REPLACE FUNCTION public.get_new_response_counts()
RETURNS TABLE (intent_id UUID, total_count INT, pending_count INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    i.id,
    count(s.id)::int AS total_count,
    count(*) FILTER (
      WHERE p.state IS NULL OR p.state NOT IN ('confirmed', 'declined')
    )::int AS pending_count
  FROM public.intents i
  JOIN public.journey_form_submissions s ON s.intent_id = i.id AND s.status = 'submitted'
  LEFT JOIN public.intent_participants p ON p.intent_id = i.id AND p.user_id = s.participant_id
  WHERE i.creator_id = auth.uid()
  GROUP BY i.id;
$$;
