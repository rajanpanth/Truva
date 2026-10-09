-- Migration 004: Score provenance
-- Keeps, for every recorded score, the exact text that was hashed and written
-- on-chain with `attest_score`, so anyone can recompute the hash and re-run
-- the scoring rules. `inputs` is TEXT on purpose: JSONB would reorder keys
-- and change the hash.

ALTER TABLE score_history ADD COLUMN IF NOT EXISTS model_version INTEGER;
ALTER TABLE score_history ADD COLUMN IF NOT EXISTS inputs_hash VARCHAR(64);
ALTER TABLE score_history ADD COLUMN IF NOT EXISTS inputs TEXT;
