-- TruvaX: Initial Database Schema
-- Run in Supabase SQL Editor

-- ============================================
-- 1. AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  pda_address TEXT,
  tier SMALLINT NOT NULL DEFAULT 1 CHECK (tier IN (1, 2, 3)),
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'flagged')),
  task_type TEXT NOT NULL CHECK (task_type IN ('swap', 'transfer', 'stake', 'lend', 'bridge', 'nft_trade', 'governance', 'custom')),
  operator_name TEXT,
  operator_email TEXT,
  description TEXT,
  max_tx_size NUMERIC NOT NULL DEFAULT 1000,
  rate_limit INTEGER NOT NULL DEFAULT 100,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_failed INTEGER NOT NULL DEFAULT 0,
  success_rate NUMERIC DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  chains TEXT[] NOT NULL DEFAULT ARRAY['solana'],
  spending_behavior TEXT DEFAULT 'standard' CHECK (spending_behavior IN ('conservative', 'standard', 'aggressive')),
  flagged BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_tier ON agents(tier);
CREATE INDEX idx_agents_public_key ON agents(public_key);

-- ============================================
-- 2. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_id TEXT,
  tx_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  token TEXT DEFAULT 'SOL',
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'blocked')),
  block_reason TEXT,
  latency_ms INTEGER,
  checks_passed TEXT[],
  checks_failed TEXT[],
  zk_proof TEXT,
  chain TEXT DEFAULT 'solana',
  enforcement_result JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_agent_id ON transactions(agent_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- 3. TRUSTGATE_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS trustgate_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  session_id TEXT,
  action TEXT,
  tx_type TEXT,
  amount NUMERIC DEFAULT 0,
  token TEXT,
  status TEXT NOT NULL CHECK (status IN ('passed', 'blocked')),
  block_reason TEXT,
  check_results JSONB DEFAULT '{}',
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trustgate_logs_agent ON trustgate_logs(agent_id);
CREATE INDEX idx_trustgate_logs_status ON trustgate_logs(status);
CREATE INDEX idx_trustgate_logs_created_at ON trustgate_logs(created_at DESC);

-- ============================================
-- 4. REPUTATION_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('success', 'fail', 'blocked', 'attested')),
  score_delta INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reputation_events_agent ON reputation_events(agent_id);

-- ============================================
-- 5. ATTESTATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  attester TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attestations_agent ON attestations(agent_id);

-- ============================================
-- 6. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'SOL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_agent ON payments(agent_id);

-- ============================================
-- 7. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trustgate_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow public read for agents and logs
CREATE POLICY "agents_public_read" ON agents FOR SELECT USING (true);
CREATE POLICY "transactions_public_read" ON transactions FOR SELECT USING (true);
CREATE POLICY "trustgate_logs_public_read" ON trustgate_logs FOR SELECT USING (true);
CREATE POLICY "reputation_events_public_read" ON reputation_events FOR SELECT USING (true);
CREATE POLICY "attestations_public_read" ON attestations FOR SELECT USING (true);
CREATE POLICY "payments_public_read" ON payments FOR SELECT USING (true);

-- Service role can insert/update all
CREATE POLICY "agents_service_insert" ON agents FOR INSERT WITH CHECK (true);
CREATE POLICY "agents_service_update" ON agents FOR UPDATE USING (true);
CREATE POLICY "transactions_service_insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "transactions_service_update" ON transactions FOR UPDATE USING (true);
CREATE POLICY "trustgate_logs_service_insert" ON trustgate_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "reputation_events_service_insert" ON reputation_events FOR INSERT WITH CHECK (true);
CREATE POLICY "attestations_service_insert" ON attestations FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_service_insert" ON payments FOR INSERT WITH CHECK (true);

-- ============================================
-- 9. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE trustgate_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
