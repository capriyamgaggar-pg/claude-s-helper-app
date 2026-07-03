-- FIX: accept_connection's early-return path (thread_id already set) returned
-- immediately WITHOUT updating connections.state to 'accepted'. This bit in
-- exactly the scenario the profile-page bug created: a connection that was
-- already accepted (with a working thread) got its state reset back to
-- 'requested' by the old Connect-button upsert bug, while thread_id stayed
-- intact. Clicking Accept afterward hit the early-return branch and quietly
-- did nothing to state, leaving the connection permanently stuck as
-- "requested" even though the thread genuinely existed and worked --
-- explaining why the Connections tab (which filters on state = 'accepted')
-- never showed it. Now state is always (re)asserted to 'accepted' before
-- returning, regardless of which path is taken.

CREATE OR REPLACE FUNCTION public.accept_connection(_connection_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conn public.connections;
  _thread_id UUID;
BEGIN
  SELECT * INTO conn FROM public.connections WHERE id = _connection_id FOR UPDATE;

  IF conn IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;

  IF auth.uid() NOT IN (conn.user_a, conn.user_b) THEN
    RAISE EXCEPTION 'Not authorized to accept this connection';
  END IF;

  _thread_id := conn.thread_id;

  IF _thread_id IS NULL THEN
    -- Reuse an existing DM thread between these two users if one already
    -- exists (e.g. from a prior partial attempt), otherwise create one.
    SELECT t.id INTO _thread_id
    FROM public.threads t
    WHERE t.kind = 'dm'
      AND EXISTS (SELECT 1 FROM public.thread_members m WHERE m.thread_id = t.id AND m.user_id = conn.user_a)
      AND EXISTS (SELECT 1 FROM public.thread_members m WHERE m.thread_id = t.id AND m.user_id = conn.user_b)
    LIMIT 1;

    IF _thread_id IS NULL THEN
      INSERT INTO public.threads (kind, intent_id) VALUES ('dm', conn.intent_id) RETURNING id INTO _thread_id;

      INSERT INTO public.thread_members (thread_id, user_id) VALUES (_thread_id, conn.user_a)
        ON CONFLICT DO NOTHING;
      INSERT INTO public.thread_members (thread_id, user_id) VALUES (_thread_id, conn.user_b)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Always (re)assert accepted state + thread link, whether the thread was
  -- just created, reused, or already linked from a prior successful accept.
  UPDATE public.connections
    SET state = 'accepted', thread_id = _thread_id, updated_at = now()
    WHERE id = conn.id;

  RETURN _thread_id;
END;
$$;
