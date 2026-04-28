-- Migration 002: Trust score alignment
-- Adds tier-numeric mapping, spending_behavior, and flagged columns for trust-alignment
-- (from app/backend/database/migrations/002_trust_alignment.sql)

-- Add spending_behavior tracking to agents if not present
ALTER TABLE agents ADD COLUMN IF NOT EXISTS spending_behavior VARCHAR(20) DEFAULT 'standard';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;

-- Add score_delta to score_history for auditing deltas
ALTER TABLE score_history ADD COLUMN IF NOT EXISTS score_delta INTEGER DEFAULT 0;

-- Index for fast flagged-agent lookups
CREATE INDEX IF NOT EXISTS idx_agents_flagged ON agents(flagged) WHERE flagged = true;
