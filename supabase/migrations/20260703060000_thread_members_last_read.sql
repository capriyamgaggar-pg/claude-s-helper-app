-- Adds per-user last-read tracking on thread_members so we can compute
-- unread message counts (needed for inbox badges). Defaults existing rows
-- to now() so nobody's flooded with "unread" history from before this
-- feature existed.

ALTER TABLE public.thread_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE POLICY "Users mark their own thread membership as read"
  ON public.thread_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
