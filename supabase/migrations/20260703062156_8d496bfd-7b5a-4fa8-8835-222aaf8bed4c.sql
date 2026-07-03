ALTER TABLE public.thread_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE POLICY "Users mark their own thread membership as read"
  ON public.thread_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_inbox_counts()
RETURNS TABLE (received_count INT, unread_messages INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (
      SELECT count(*)::int FROM public.connections c
      WHERE auth.uid() IN (c.user_a, c.user_b)
        AND c.state = 'requested'
        AND c.requested_by <> auth.uid()
    ) AS received_count,
    (
      SELECT count(*)::int
      FROM public.thread_members tm
      JOIN public.messages m ON m.thread_id = tm.thread_id
      WHERE tm.user_id = auth.uid()
        AND m.sender_id <> auth.uid()
        AND m.created_at > tm.last_read_at
    ) AS unread_messages;
$$;

REVOKE ALL ON FUNCTION public.get_inbox_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inbox_counts() TO authenticated;