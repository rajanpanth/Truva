-- Migration 003: Solana Agent Registry reputation
-- Stores each agent's ERC-8004 identity and feedback summary, read from the
-- Solana Agent Registry and used as a scoring signal.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS registry_asset VARCHAR(44);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS registry_feedbacks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS registry_avg_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS registry_synced_at TIMESTAMPTZ;
