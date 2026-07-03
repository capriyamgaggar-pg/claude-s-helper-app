-- FIX (Critical): profiles carries sensitive columns not present when the
-- column-level SELECT grant was last set (phone, dob, blood_group,
-- address_line1, address_line2, pincode, emergency_contact_name,
-- emergency_contact_phone, lat, lng) -- these were readable by every
-- authenticated user via the permissive "USING (true)" row policy, since
-- the column grant hadn't been updated to exclude them.
--
-- NOT following the scanner's own suggested fix here: restricting the base
-- table to id = auth.uid() only would break every legitimate cross-user
-- read this app relies on (home feed creator names/photos, chat
-- participant info, connections list, public profile pages) -- all fixed
-- earlier this session and confirmed working.
--
-- The correct, narrower fix: keep the permissive row policy (it only ever
-- exposes what the column grant allows), and re-assert the column grant
-- explicitly, which naturally excludes any column not listed -- including
-- the newly-discovered sensitive ones. The owner's own sensitive fields
-- remain fully readable via get_my_profile(), the existing SECURITY
-- DEFINER/INVOKER function (SELECT * WHERE id = auth.uid()) already used
-- by onboarding and the Edit Profile screen -- that path is unaffected.

REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (
  id, name, photo_url, bio, city, locality, state, country, place_id,
  profession, interests, languages, linkedin_url, instagram_url,
  onboarded, created_at, updated_at
) ON public.profiles TO authenticated;

-- Explicitly NOT granted to authenticated (owner-only, via get_my_profile()):
-- phone, dob, blood_group, address_line1, address_line2, pincode,
-- emergency_contact_name, emergency_contact_phone, lat, lng
