-- Migration: 005_delegations
-- Creates the delegations table to record wallet-to-agent delegation events.

create table if not exists public.delegations (
  id          uuid primary key default gen_random_uuid(),
  wallet      text        not null,
  agent_id    text        not null,
  agent_name  text        not null,
  amount_sol  numeric     not null,
  cap_usd     numeric,
  duration    text,
  tx_sig      text,
  status      text        not null default 'active',
  created_at  timestamptz not null default now()
);

-- Databases created before tx_sig was part of this file
alter table public.delegations add column if not exists tx_sig text;

-- Index for quick lookup by wallet
create index if not exists delegations_wallet_idx on public.delegations (wallet);

-- Index for quick lookup by agent
create index if not exists delegations_agent_id_idx on public.delegations (agent_id);
