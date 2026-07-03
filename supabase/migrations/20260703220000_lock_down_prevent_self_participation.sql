-- FIX: prevent_self_participation() was created without the usual
-- REVOKE/GRANT pair the other functions in this migration set follow --
-- an oversight, not a needed exception. As a BEFORE INSERT/UPDATE trigger
-- function, it's invoked automatically by Postgres whenever a row changes;
-- no role, including authenticated, ever needs direct EXECUTE access to it
-- for the trigger itself to fire correctly. Locking it down to nobody.

REVOKE ALL ON FUNCTION public.prevent_self_participation() FROM PUBLIC, anon, authenticated;
