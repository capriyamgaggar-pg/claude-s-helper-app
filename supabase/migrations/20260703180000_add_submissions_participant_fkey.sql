-- FIX: journey_form_submissions.participant_id was never given an actual
-- foreign key constraint -- just a plain uuid column with a comment
-- ("-- auth.users.id"). The Responses page queries this table with an
-- embedded profiles lookup hinted by a constraint name
-- (profiles!journey_form_submissions_participant_id_fkey) that never
-- existed, so PostgREST can't resolve the relationship and the whole
-- query 400s -- breaking the entire Responses page, not just Approve/
-- Decline.

ALTER TABLE public.journey_form_submissions
  ADD CONSTRAINT journey_form_submissions_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
