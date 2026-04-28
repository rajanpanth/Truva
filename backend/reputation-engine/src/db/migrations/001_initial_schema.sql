-- Migration 001: Initial schema
-- Creates core tables for Truva Protocol reputation engine

CREATE TABLE IF NOT EXISTS agents (
  pubkey VARCHAR(44) PRIMARY KEY,
  registered_at TIMESTAMP DEFAULT NOW(),
  current_tier VARCHAR(10) DEFAULT 'Bronze',
  current_score INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  agent_pubkey VARCHAR(44) REFERENCES agents(pubkey),
  tx_hash VARCHAR(88) UNIQUE NOT NULL,
  success BOOLEAN NOT NULL,
  counterparty VARCHAR(44),
  volume BIGINT DEFAULT 0,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent_pubkey);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);

CREATE TABLE IF NOT EXISTS zk_proofs (
  id SERIAL PRIMARY KEY,
  agent_pubkey VARCHAR(44) REFERENCES agents(pubkey),
  proof_hash VARCHAR(88) NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zk_proofs_agent ON zk_proofs(agent_pubkey);

CREATE TABLE IF NOT EXISTS attestations (
  id SERIAL PRIMARY KEY,
  agent_pubkey VARCHAR(44) REFERENCES agents(pubkey),
  validator_pubkey VARCHAR(44) NOT NULL,
  attested_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestations_agent ON attestations(agent_pubkey);

CREATE TABLE IF NOT EXISTS score_history (
  id SERIAL PRIMARY KEY,
  agent_pubkey VARCHAR(44) REFERENCES agents(pubkey),
  score INTEGER NOT NULL,
  tier VARCHAR(10) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_agent ON score_history(agent_pubkey);
CREATE INDEX IF NOT EXISTS idx_score_history_recorded ON score_history(recorded_at);
