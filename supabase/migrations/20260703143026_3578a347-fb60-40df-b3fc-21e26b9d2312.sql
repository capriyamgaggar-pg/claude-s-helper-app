ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated role can INSERT and UPDATE all columns required for upsert
GRANT INSERT, UPDATE, DELETE, SELECT ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;

-- Re-apply the upsert-friendly policies to avoid regression
DROP POLICY IF EXISTS "connections_select_all" ON public.connections;
CREATE POLICY "connections_select_all" ON public.connections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "connections_insert_pair" ON public.connections;
CREATE POLICY "connections_insert_pair" ON public.connections
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (user_a, user_b)
  );

DROP POLICY IF EXISTS "connections_update_pair" ON public.connections;
CREATE POLICY "connections_update_pair" ON public.connections
  FOR UPDATE TO authenticated USING (
    auth.uid() IN (user_a, user_b)
  ) WITH CHECK (
    auth.uid() IN (user_a, user_b)
  );

DROP POLICY IF EXISTS "connections_delete_pair" ON public.connections;
CREATE POLICY "connections_delete_pair" ON public.connections
  FOR DELETE TO authenticated USING (
    auth.uid() IN (user_a, user_b)
  );