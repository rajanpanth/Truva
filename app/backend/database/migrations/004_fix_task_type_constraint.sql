-- Migration 004: Update agents task_type check constraint to match app schema
-- Old constraint: swap, transfer, stake, lend, bridge, nft_trade, governance, custom
-- New constraint: matches the registerAgentFullSchema enum values

-- Step 1: Drop old constraint
ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_task_type_check;

-- Step 2: Migrate existing rows to new valid values
UPDATE agents SET task_type = 'trading'   WHERE task_type IN ('swap', 'transfer', 'governance');
UPDATE agents SET task_type = 'execution' WHERE task_type IN ('bridge', 'nft_trade');
UPDATE agents SET task_type = 'yield'     WHERE task_type IN ('stake', 'lend');
UPDATE agents SET task_type = 'data'      WHERE task_type = 'custom';

-- Step 3: Add new constraint
ALTER TABLE agents
  ADD CONSTRAINT agents_task_type_check
    CHECK (task_type IN ('trading', 'yield', 'data', 'execution', 'risk', 'treasury', 'monitoring', 'payment'));
