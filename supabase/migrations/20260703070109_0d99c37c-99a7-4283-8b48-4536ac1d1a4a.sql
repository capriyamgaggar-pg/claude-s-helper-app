REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (
  id, name, photo_url, bio, city, locality, state, country, place_id,
  profession, interests, languages, linkedin_url, instagram_url,
  onboarded, created_at, updated_at
) ON public.profiles TO authenticated;