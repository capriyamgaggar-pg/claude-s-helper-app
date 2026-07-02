
-- Drop the overly-broad SELECT policy on profiles; owner-only policy remains.
-- Cross-user profile reads must go through the public_profiles view.
DROP POLICY IF EXISTS "Authenticated can read profile rows" ON public.profiles;

-- Replace permissive deny-by-exclusion policies on the export bucket with
-- true RESTRICTIVE deny policies that cannot be OR-ed away by other policies.
DROP POLICY IF EXISTS "Deny authenticated select on database_export bucket" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated insert on database_export bucket" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated update on database_export bucket" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated delete on database_export bucket" ON storage.objects;

CREATE POLICY "Restrict database_export bucket select"
  ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (bucket_id <> 'database_export_02_07_26');

CREATE POLICY "Restrict database_export bucket insert"
  ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id <> 'database_export_02_07_26');

CREATE POLICY "Restrict database_export bucket update"
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id <> 'database_export_02_07_26')
  WITH CHECK (bucket_id <> 'database_export_02_07_26');

CREATE POLICY "Restrict database_export bucket delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id <> 'database_export_02_07_26');
