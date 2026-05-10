-- 005_delegations.sql
-- Tracks delegation records when users delegate SOL to agents

CREATE TABLE IF NOT EXISTS delegations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet      TEXT        NOT NULL,               -- delegator wallet (base58)
  agent_id    UUID        NOT NULL,               -- FK to agents.id
  agent_name  TEXT        NOT NULL,               -- denormalized for quick reads
  amount_sol  NUMERIC     NOT NULL DEFAULT 0,     -- SOL delegated
  cap_usd     NUMERIC     NOT NULL DEFAULT 1000,  -- spending cap per TX in USD
  duration    TEXT        NOT NULL DEFAULT '30_DAYS',
  tx_sig      TEXT,                               -- on-chain tx signature (null for demo mode)
  status      TEXT        NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by wallet
CREATE INDEX IF NOT EXISTS idx_delegations_wallet ON delegations(wallet);

-- Index for fast lookups by agent
CREATE INDEX IF NOT EXISTS idx_delegations_agent_id ON delegations(agent_id);

-- Allow public inserts (anon key) — the client writes delegation records
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public inserts on delegations"
  ON delegations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public reads on delegations"
  ON delegations FOR SELECT
  USING (true);
