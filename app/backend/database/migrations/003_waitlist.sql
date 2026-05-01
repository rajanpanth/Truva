-- TruvaX: Migration 003 - Waitlist table
-- Moves waitlist storage from local JSON file to Supabase

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'DEVELOPER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (sign-up form)
DROP POLICY IF EXISTS "waitlist_public_insert" ON waitlist;
CREATE POLICY "waitlist_public_insert" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Service role can read everything
DROP POLICY IF EXISTS "waitlist_service_read" ON waitlist;
CREATE POLICY "waitlist_service_read" ON waitlist
  FOR SELECT USING (true);
