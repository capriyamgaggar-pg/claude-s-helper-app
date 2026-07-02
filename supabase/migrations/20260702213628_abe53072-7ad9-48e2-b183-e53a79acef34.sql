CREATE POLICY "Authenticated can read profile rows"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);