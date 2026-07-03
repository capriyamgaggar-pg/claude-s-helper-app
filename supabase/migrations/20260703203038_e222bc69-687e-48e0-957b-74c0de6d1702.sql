ALTER TABLE public.journey_form_submissions
  ADD CONSTRAINT journey_form_submissions_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;