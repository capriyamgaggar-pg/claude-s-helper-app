-- The intent_participants SELECT policy only lets you see your own rows,
-- or rows on intents you created -- correct for privacy, but it means a
-- plain client-side count query for "intents joined" undercounts (or
-- returns 0) when viewing someone else's public profile, since the viewer
-- can't see that person's participation on other people's intents.
--
-- This is meant to be a public reputation number (same category as the
-- other stats already shown on profiles), so expose just the count via a
-- SECURITY DEFINER function rather than loosening the underlying RLS.

CREATE OR REPLACE FUNCTION public.get_intents_joined_count(target_user_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int
  FROM public.intent_participants
  WHERE user_id = target_user_id AND state = 'confirmed';
$$;

REVOKE ALL ON FUNCTION public.get_intents_joined_count(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_intents_joined_count(UUID) TO authenticated;
