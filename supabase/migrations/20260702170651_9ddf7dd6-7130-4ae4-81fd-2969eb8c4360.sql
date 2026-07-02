
DROP FUNCTION IF EXISTS public.get_my_profile();
DROP TYPE IF EXISTS public.my_profile;

CREATE TYPE public.my_profile AS (
  id uuid,
  name text,
  photo_url text,
  city text,
  profession text,
  bio text,
  languages text[],
  interests text[],
  linkedin_url text,
  instagram_url text,
  onboarded boolean,
  created_at timestamptz,
  updated_at timestamptz,
  locality text,
  state text,
  country text,
  lat double precision,
  lng double precision,
  place_id text,
  phone text,
  dob date,
  blood_group text,
  emergency_contact_name text,
  emergency_contact_phone text,
  address_line1 text,
  address_line2 text,
  pincode text
);

CREATE FUNCTION public.get_my_profile()
RETURNS public.my_profile
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.name, p.photo_url, p.city, p.profession, p.bio, p.languages, p.interests,
    p.linkedin_url, p.instagram_url, p.onboarded, p.created_at, p.updated_at,
    p.locality, p.state, p.country, p.lat, p.lng, p.place_id,
    p.phone, p.dob, p.blood_group, p.emergency_contact_name, p.emergency_contact_phone,
    p.address_line1, p.address_line2, p.pincode
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
