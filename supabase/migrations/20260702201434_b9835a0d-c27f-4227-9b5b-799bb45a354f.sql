
-- 1) Tighten profiles SELECT policy: RLS restricts rows to owner only.
-- Cross-user reads must go through the SECURITY DEFINER public.public_profiles view,
-- which exposes only safe columns. This ensures sensitive columns cannot be read
-- even if column GRANTs are bypassed (e.g., via a SECURITY DEFINER function).
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can read profiles via public view" ON public.profiles;

CREATE POLICY "Users can view their own profile row"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2) Explicit deny-all storage.objects policies for the private
-- 'database_export_02_07_26' bucket. Only service_role (which bypasses RLS)
-- may access these objects; authenticated and anon users get no access.
DROP POLICY IF EXISTS "Deny authenticated select on database_export bucket" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated insert on database_export bucket" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated update on database_export bucket" ON storage.objects;
DROP POLICY IF EXISTS "Deny authenticated delete on database_export bucket" ON storage.objects;

CREATE POLICY "Deny authenticated select on database_export bucket"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id <> 'database_export_02_07_26');

CREATE POLICY "Deny authenticated insert on database_export bucket"
  ON storage.objects FOR INSERT TO authenticated, anon
  WITH CHECK (bucket_id <> 'database_export_02_07_26');

CREATE POLICY "Deny authenticated update on database_export bucket"
  ON storage.objects FOR UPDATE TO authenticated, anon
  USING (bucket_id <> 'database_export_02_07_26')
  WITH CHECK (bucket_id <> 'database_export_02_07_26');

CREATE POLICY "Deny authenticated delete on database_export bucket"
  ON storage.objects FOR DELETE TO authenticated, anon
  USING (bucket_id <> 'database_export_02_07_26');
