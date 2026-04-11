-- TruvaX: Migration 002 - Trust tier alignment & new features
-- Aligns DB tier thresholds with on-chain program (Bronze 0-49, Silver 50-79, Gold 80-100)
-- Adds support for passport freezing, SPL tokens, and improved indexing

-- ============================================
-- 1. Add is_frozen column to agents
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- 2. Add tx_signature column for on-chain registration proof
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tx_signature TEXT;

-- ============================================
-- 3. Update TIER_MIN_SCORES to match on-chain thresholds
-- Recalculate tier from trust_score to fix any stale data
-- Bronze: 0-49, Silver: 50-79, Gold: 80-100
-- ============================================
UPDATE agents SET tier = CASE
  WHEN trust_score >= 80 THEN 3
  WHEN trust_score >= 50 THEN 2
  ELSE 1
END
WHERE tier != CASE
  WHEN trust_score >= 80 THEN 3
  WHEN trust_score >= 50 THEN 2
  ELSE 1
END;

-- ============================================
-- 4. Add token column to transactions for SPL token support
-- ============================================
-- Already exists from 001_initial.sql, just ensure it has a default
ALTER TABLE transactions ALTER COLUMN token SET DEFAULT 'SOL';

-- ============================================
-- 5. Add agent_name to trustgate_logs for faster display
-- ============================================
-- Already exists from 001_initial.sql

-- ============================================
-- 6. Add RLS policies for Supabase
-- ============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustgate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

-- Public read access for agents
CREATE POLICY IF NOT EXISTS "agents_public_read" ON agents
  FOR SELECT USING (true);

-- Public read access for trustgate_logs (for realtime dashboard)
CREATE POLICY IF NOT EXISTS "trustgate_logs_public_read" ON trustgate_logs
  FOR SELECT USING (true);

-- Public read access for transactions
CREATE POLICY IF NOT EXISTS "transactions_public_read" ON transactions
  FOR SELECT USING (true);

-- Service role can insert/update/delete (API routes use service role key)
-- These are automatically handled by Supabase service role

-- ============================================
-- 7. Enable realtime for trustgate_logs (needed by useRealtimeLogs hook)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE trustgate_logs;

-- ============================================
-- 8. Add composite index for common query patterns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agents_tier_score ON agents(tier, trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_agent_created ON transactions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trustgate_logs_agent_created ON trustgate_logs(agent_id, created_at DESC);
