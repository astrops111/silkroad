-- Supabase linter: function_search_path_mutable (WARN, SECURITY)
-- Pins search_path on every public-schema function still missing it, so an
-- unqualified name inside the function body can't resolve against a schema
-- placed earlier on the caller's search_path. Matches the fix already applied
-- to other functions in 00075/00094/00128/00129/00141 (SET search_path = public).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;
