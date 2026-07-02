
-- Drop the SECURITY DEFINER view (flagged by linter)
DROP VIEW IF EXISTS public.public_profiles;

-- Replace owner-only SELECT with a permissive policy; column-level grants restrict sensitive fields
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Authenticated can read profile rows"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Revoke broad SELECT then re-grant only non-sensitive columns to authenticated
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, name, photo_url, bio, city, locality, state, country, place_id,
  profession, interests, languages, linkedin_url, instagram_url,
  onboarded, created_at, updated_at
) ON public.profiles TO authenticated;

-- Owner still needs INSERT/UPDATE on all columns
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
