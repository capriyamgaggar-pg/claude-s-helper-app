
-- 1) PROFILES: column-level grants to protect sensitive fields
-- Keep existing SELECT policy USING(true) but restrict columns via GRANTs.
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT
  (id, name, photo_url, city, profession, bio, languages, interests,
   linkedin_url, instagram_url, locality, state, country, place_id,
   onboarded, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Owner still needs to write all columns
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Helper for owner to read their own full profile (including sensitive fields)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 2) THREADS: restrict INSERT to intent creator / participant, or DMs (no intent)
DROP POLICY IF EXISTS "Signed-in users can create threads" ON public.threads;
CREATE POLICY "Users create allowed threads"
ON public.threads FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    intent_id IS NULL
    OR public.is_intent_creator(intent_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.intent_participants p
      WHERE p.intent_id = threads.intent_id
        AND p.user_id = auth.uid()
        AND p.state IN ('interested','joining','confirmed')
    )
  )
);

-- 3) STORAGE: allow owners to UPDATE/DELETE their own registration uploads
CREATE POLICY "Users update own registration files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'registration-uploads'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'registration-uploads'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Users delete own registration files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'registration-uploads'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4) Revoke EXECUTE on trigger-only / internal SECURITY DEFINER functions
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'handle_new_user()',
    'touch_updated_at()',
    'handle_intent_closed()',
    'handle_participant_confirmed()',
    'on_community_history_reputation()',
    'on_message_reputation()',
    'on_connection_lock_visibility()',
    'on_intent_participant_lock_visibility()',
    'on_form_submission_lock_visibility()',
    'on_connection_reputation()',
    'on_intent_reputation()',
    'on_participant_reputation()',
    'on_feedback_insert()',
    'on_intent_completed_feedback()',
    'bump_form_version()',
    'rep_bump(uuid, text, integer)',
    'rep_bump_category(uuid, text, integer)',
    'rep_log(uuid, text, uuid, jsonb)',
    'lock_intent_visibility(uuid)',
    'expire_intents_job()'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
