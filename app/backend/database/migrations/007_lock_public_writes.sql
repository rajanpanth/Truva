-- TruvaX: Migration 007 - Stop the public API keys from writing to the database
--
-- The anon key ships in the browser bundle. Migration 001 named its write
-- policies "*_service_*" but declared them without a role, so they applied to
-- everyone: any visitor could insert or edit agents (including trust scores),
-- transactions and logs straight through the Supabase REST API. `delegations`
-- (migration 005) had no row level security at all.
--
-- After this migration the public roles can only:
--   * read the tables that already had a public-read policy
--   * insert into `waitlist` and `delegations` (the browser forms that do so)
-- API routes and the reputation engine use the service role key, which
-- bypasses RLS and keeps full access.
-- Safe to run more than once.

-- ============================================
-- 1. Drop the write policies that were open to every role
-- ============================================
-- (skips tables that do not exist in this database)
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname IN (
         'agents_service_insert', 'agents_service_update',
         'transactions_service_insert', 'transactions_service_update',
         'trustgate_logs_service_insert', 'reputation_events_service_insert',
         'attestations_service_insert', 'payments_service_insert'
       )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- ============================================
-- 2. Revoke write privileges on every table in the public schema
-- ============================================
-- Covers tables that were created without RLS as well.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated',
      t.tablename
    );
  END LOOP;
END $$;

-- Tables created later start read-only for the public roles too.
-- NOTE: a new table that needs browser inserts must grant them explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;

-- ============================================
-- 3. delegations: insert-only for the public roles
-- ============================================
-- The delegate page records a delegation from the browser. Nothing reads the
-- table with the anon key, so no SELECT policy is created.
DO $$
BEGIN
  IF to_regclass('public.delegations') IS NOT NULL THEN
    ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "delegations_public_insert" ON delegations;
    CREATE POLICY "delegations_public_insert" ON delegations
      FOR INSERT TO anon, authenticated WITH CHECK (true);
    GRANT INSERT ON delegations TO anon, authenticated;
    REVOKE SELECT ON delegations FROM anon, authenticated;
  END IF;
END $$;

-- ============================================
-- 4. waitlist: keep the sign-up insert from migration 003
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.waitlist') IS NOT NULL THEN
    GRANT INSERT ON waitlist TO anon, authenticated;
  END IF;
END $$;
