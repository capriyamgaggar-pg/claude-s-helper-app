-- FIX: migration 20260702211613 ("Fixed security findings") dropped
-- "Authenticated can read profile rows" on the assumption that cross-user
-- profile reads happen through a `public_profiles` view instead. That view
-- does not exist -- it was created and then explicitly DROPPED in an
-- earlier migration (20260702082219, "Drop the SECURITY DEFINER view
-- (flagged by linter)"). With that policy gone, `profiles` has zero
-- SELECT policies for authenticated users, so RLS denies every row --
-- breaking every embedded profile join app-wide (chat list showing no
-- name/photo, connections list, home feed creator names, 500s on nested
-- queries that require the embed).
--
-- Sensitive fields were never exposed by the policy itself -- that's
-- handled separately by the column-level GRANT already in place (only
-- id, name, photo_url, bio, city, locality, state, country, place_id,
-- profession, interests, languages, linkedin_url, instagram_url,
-- onboarded, created_at, updated_at are granted to `authenticated`).
-- Restoring row-level SELECT access is safe and necessary for the app
-- to function; it does not re-expose anything the column grant blocks.

CREATE POLICY "Authenticated can read profile rows"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
