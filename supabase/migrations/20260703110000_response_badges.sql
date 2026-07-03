-- Tracks when an organizer last viewed responses for their intent, so we
-- can badge intent cards with "new responses since you last checked" --
-- mirroring the last_read_at pattern already used for chat threads.
-- Defaults to now() so existing intents/submissions don't retroactively
-- show a flood of "new" badges the first time this ships.

ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS responses_last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.get_new_response_counts()
RETURNS TABLE (intent_id UUID, new_count INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, count(s.id)::int
  FROM public.intents i
  JOIN public.journey_form_submissions s ON s.intent_id = i.id
  WHERE i.creator_id = auth.uid()
    AND s.status = 'submitted'
    AND s.submitted_at > i.responses_last_viewed_at
  GROUP BY i.id;
$$;

REVOKE ALL ON FUNCTION public.get_new_response_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_new_response_counts() TO authenticated;
