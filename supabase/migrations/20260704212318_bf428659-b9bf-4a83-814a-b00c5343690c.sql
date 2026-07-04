
-- Restrict which profile columns authenticated users can read directly.
-- Sensitive PII (phone, dob, blood_group, emergency contact, address, precise
-- geo) is stripped from the Data API grant. Owners still read their full row
-- via the security-definer RPC public.get_my_profile().

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  name,
  photo_url,
  city,
  profession,
  bio,
  languages,
  interests,
  linkedin_url,
  instagram_url,
  onboarded,
  created_at,
  updated_at,
  locality,
  state,
  country
) ON public.profiles TO authenticated;

-- Owners still need to write their own row. INSERT/UPDATE stay unrestricted at
-- the column level; the existing RLS policies enforce auth.uid() = id.
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Service role keeps full access for admin/maintenance.
GRANT ALL ON public.profiles TO service_role;
