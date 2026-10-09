-- TruvaX: Migration 006 - Hide private email addresses from the public API keys
--
-- The anon key ships in the browser bundle, so anything the `anon` role can
-- SELECT is public. Two tables exposed email addresses that way:
--   * agents.operator_email  (via the "agents_public_read" policy)
--   * waitlist.email         (via "waitlist_service_read", which applied to every role)
--
-- API routes use the service role key, which bypasses RLS and keeps full access.
-- Safe to run more than once.

-- ============================================
-- 1. agents: public roles may read every column except operator_email
-- ============================================
-- Column privileges only take effect once the table-wide SELECT is gone.
REVOKE SELECT ON agents FROM anon, authenticated;

-- Grant the remaining columns from the live schema, so this does not depend
-- on which earlier migrations have been applied.
DO $$
DECLARE
  public_columns TEXT;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO public_columns
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'agents'
     AND column_name <> 'operator_email';

  EXECUTE format('GRANT SELECT (%s) ON agents TO anon, authenticated', public_columns);
END $$;

-- NOTE: columns added to `agents` later are NOT readable by anon/authenticated
-- until granted:  GRANT SELECT (new_column) ON agents TO anon, authenticated;

-- ============================================
-- 2. waitlist: sign-ups stay open, reading is service-role only
-- ============================================
DO $$
BEGIN
  -- Skipped when migration 003 was never applied
  IF to_regclass('public.waitlist') IS NOT NULL THEN
    DROP POLICY IF EXISTS "waitlist_service_read" ON waitlist;
    REVOKE SELECT ON waitlist FROM anon, authenticated;
  END IF;
END $$;
