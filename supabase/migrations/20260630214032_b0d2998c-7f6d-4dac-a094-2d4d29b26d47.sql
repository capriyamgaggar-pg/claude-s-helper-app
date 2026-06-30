
CREATE OR REPLACE FUNCTION public.expire_intents_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, creator_id, title
    FROM public.intents
    WHERE status = 'active' AND expires_at < now()
  LOOP
    UPDATE public.intents SET status = 'expired' WHERE id = r.id;

    INSERT INTO public.notifications (user_id, kind, payload)
    VALUES (
      r.creator_id,
      'intent_expired',
      jsonb_build_object('intent_id', r.id, 'title', r.title)
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_intents_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_intents_job() TO service_role;
