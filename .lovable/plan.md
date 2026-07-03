## Fix Responses page 400 by adding missing FK

The `journey_form_submissions.participant_id` column was created without an actual foreign key constraint. The Responses page (`src/routes/_authenticated/intents.$intentId.submissions.tsx`) uses a PostgREST embedded lookup hinted by the constraint name `profiles!journey_form_submissions_participant_id_fkey`, which doesn't exist — so PostgREST returns 400 and the page falls back (or breaks) for both fetching and Approve/Decline.

### Migration

Add the missing FK from `journey_form_submissions.participant_id` → `profiles(id)` with `ON DELETE CASCADE`, matching the constraint name the query already references:

```sql
ALTER TABLE public.journey_form_submissions
  ADD CONSTRAINT journey_form_submissions_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

### Scope

Strictly limited to running this one migration. No code changes — the Responses page query already targets this constraint name and will start resolving correctly once the FK exists.
