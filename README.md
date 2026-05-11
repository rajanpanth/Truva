# Truva Protocol

[![Solana](https://img.shields.io/badge/Solana-Devnet-blue)](https://explorer.solana.com/address/BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-v0.30+-purple)](https://www.anchor-lang.com/)
[![Tests](https://img.shields.io/badge/Tests-13%20Passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**The trust and reputation layer for AI agents on Solana.**

Truva Protocol provides programmable, on-chain trust gates for AI agent payments. Every agent gets a **Passport PDA** with a trust score (0-100) and tier (Bronze → Silver → Gold). Any Solana protocol can integrate TrustGate to block untrusted agents with a single CPI call.

> **Program ID:** `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5`
> **Network:** Solana Devnet · **Framework:** Anchor · **Language:** Rust + TypeScript

## Key Features

- **🛡️ TrustGate** — On-chain payment gating with a single CPI call. Block untrusted agents before any SOL/SPL transfer executes.
- **🪪 Agent Passports** — PDA-based identity with trust score, tier, transaction history, and freeze capability.
- **📊 6-Signal Scoring Engine** — Off-chain reputation scoring from transaction volume, success rate, counterparty diversity, account age, ZK proofs, and validator attestations.
- **⛓️ On-Chain Tier Enforcement** — Bronze (5 SOL limit), Silver (100 SOL), Gold (unlimited). Tier-based amount caps enforced at the program level.
- **🔌 SDK & Integrations** — TypeScript SDK with Eliza plugin and LangChain tool support for AI agent frameworks.
- **🧊 Emergency Freeze** — Authority can instantly freeze any agent passport, blocking all transactions system-wide.
- **📡 Real-Time Indexing** — Helius webhook integration for automatic transaction monitoring and score recalculation.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    TRUVA PROTOCOL                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            SOLANA ANCHOR PROGRAM                    │ │
│  │                                                     │ │
│  │  PDA: ["passport", agent_pubkey]                    │ │
│  │  State: agent | trust_score | trust_tier | tx_count │ │
│  │         | success_count | frozen | authority        │ │
│  │                                                     │ │
│  │  Instructions:                                      │ │
│  │    initialize_passport → create new passport        │ │
│  │    update_trust_tier   → authority sets score/tier   │ │
│  │    process_payment_sol → trust-gated SOL transfer   │ │
│  │    process_payment_spl → trust-gated SPL transfer   │ │
│  │    freeze_passport     → block all payments         │ │
│  │    unfreeze_passport   → re-enable payments         │ │
│  │    close_passport      → reclaim rent               │ │
│  └─────────────────────────────────────────────────────┘ │
│                         ▲                                │
│                         │ on-chain writes                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          REPUTATION ENGINE (Backend)                │ │
│  │                                                     │ │
│  │  Helius Webhooks → Transaction Indexing             │ │
│  │  6-Signal Scorer → Trust Score (0-100)              │ │
│  │  Chain Writer    → On-chain tier updates            │ │
│  │  PostgreSQL + Redis                                 │ │
│  │  REST API at /api/agents, /api/stats                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           SDK (@truva-protocol/sdk)                 │ │
│  │                                                     │ │
│  │  truva.getAgentScore()    → on-chain PDA read      │ │
│  │  truva.requireTrustTier() → throws if insufficient  │ │
│  │  truva.register()         → REST API               │ │
│  │  truva.getAgentProfile()  → REST API               │ │
│  │  truva.isEligible()       → REST API               │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Trust Tiers

| Tier   | Score  | Access Level            | Requirements                                                              |
|--------|--------|-------------------------|---------------------------------------------------------------------------|
| Bronze | 0-49   | Basic ops, 5 SOL limit  | Default                                                                   |
| Silver | 50-79  | Standard flows, 100 SOL | ≥10 txs, ≥80% success, ≥5 counterparties, ≥1 attestation                 |
| Gold   | 80-100 | Full DeFi, unlimited    | ≥30 txs, ≥90% success, ≥10 counterparties, ≥2 attestations, ≥1 ZK proof |

---

## Project Structure

```
truva/
├── programs/trustgate/         # Solana Anchor program (Rust)
│   └── src/
│       ├── lib.rs              # Program entry + 7 instructions
│       ├── state/
│       │   ├── mod.rs
│       │   └── passport.rs     # AgentPassport account + TrustTier enum + events
│       ├── instructions/
│       │   ├── mod.rs
│       │   ├── initialize_passport.rs
│       │   ├── update_trust_tier.rs
│       │   ├── process_payment_sol.rs
│       │   ├── process_payment_spl.rs
│       │   ├── freeze_passport.rs
│       │   └── close_passport.rs
│       └── errors.rs           # TruvaError enum
├── app/                        # Next.js 14 frontend (DO NOT TOUCH)
├── backend/reputation-engine/  # Off-chain reputation engine
│   ├── src/
│   │   ├── index.ts            # Express server
│   │   ├── webhooks/
│   │   │   └── helius.ts       # Helius webhook handler
│   │   ├── services/
│   │   │   ├── scorer.ts       # 6-signal trust score calculator
│   │   │   ├── backfill.ts     # Historical tx analysis
│   │   │   └── chain-writer.ts # On-chain PDA updater
│   │   ├── db/
│   │   │   ├── schema.ts       # PostgreSQL schema (5 tables)
│   │   │   └── client.ts       # DB connection pool
│   │   ├── cache/
│   │   │   └── redis.ts        # Redis score cache
│   │   └── routes/
│   │       ├── agents.ts       # Agent CRUD endpoints
│   │       └── scores.ts       # Aggregate stats
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── sdk/                        # Developer SDK (TypeScript)
│   └── src/index.ts            # Truva class + TruvaError
├── scripts/
│   ├── seedAgents.ts           # Seed 10 demo agents
│   └── simulateTransactions.ts # Simulate 50 txs for testing
├── tests/
│   └── trustgate.test.ts       # Anchor test suite (13 tests)
└── README.md
```

---

## Prerequisites

- [Rust](https://rustup.rs/) + Cargo
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (v0.30+)
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)
- [Redis](https://redis.io/) (v7+)
- [RPC Fast](https://rpcfast.com) — High-performance Solana RPC (recommended)
- npm or pnpm

> **Quick start with Docker:** `docker-compose -f docker-compose.dev.yml up` to spin up PostgreSQL and Redis locally.

---

## Setup

### 1. Clone & Install

```bash
git clone <repo-url> truva
cd truva
npm install
cd app && npm install && cd ..
cd backend/reputation-engine && npm install && cd ../..
cd sdk && npm install && cd ..
```

### 2. Configure Environment

```bash
cp backend/reputation-engine/.env.example backend/reputation-engine/.env
```

Edit `backend/reputation-engine/.env` with your values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/truva
REDIS_URL=redis://localhost:6379
SOLANA_RPC_URL=https://solana-devnet.rpcfast.com?api_key=YOUR_RPCFAST_API_KEY
TRUVA_PROGRAM_ID=<your_program_id>
BACKEND_AUTHORITY_KEY=<your_base58_keypair>
HELIUS_API_KEY=<your_helius_key>
HELIUS_WEBHOOK_SECRET=<your_webhook_secret>
```

### 3. Set Up Database

```bash
# Create the database
createdb truva

# Run migrations
npm run db:migrate
```

### 4. Build & Deploy the Anchor Program

```bash
# Terminal 1: Start local validator
solana-test-validator

# Terminal 2: Build and deploy
anchor build
anchor deploy
```

After deploying, update the program ID in:
- `Anchor.toml` (both localnet and devnet)
- `programs/trustgate/src/lib.rs` (`declare_id!`)
- `sdk/src/index.ts` (`TRUSTGATE_PROGRAM_ID`)
- `backend/reputation-engine/.env` (`TRUVA_PROGRAM_ID`)

### 5. Run Tests

```bash
anchor test
```

Expected output:
```
TrustGate
  initialize_passport
    ✓ initializes a passport correctly
    ✓ starts agent at Bronze tier with score 0
  update_trust_tier
    ✓ updates trust tier when called by authority
    ✓ rejects tier update from non-authority
  freeze_passport / unfreeze_passport
    ✓ freezes passport correctly
    ✓ unfreezes passport correctly
  process_payment_sol
    ✓ blocks payment when agent is frozen
    ✓ blocks payment when tier is insufficient
    ✓ processes SOL payment for Gold tier agent
    ✓ rejects payment exceeding Bronze tier limit
    ✓ allows payment within Silver tier limit
  process_payment_spl
    ✓ processes SPL payment for Gold tier agent
  close_passport
    ✓ closes passport and reclaims rent
```

### 6. Start the Backend

```bash
npm run dev:backend
```

The reputation engine will start at `http://localhost:3001`.

### 7. Seed Demo Agents

```bash
npm run seed
```

### 8. Run Transaction Simulation

```bash
npm run simulate -- <agent_pubkey>
```

### 9. Start Frontend

```bash
npm run dev:app
```

Open [http://localhost:3000](http://localhost:3000)

---

## Configuring Helius Webhook

1. Go to [Helius Dashboard](https://dev.helius.xyz/dashboard)
2. Create a new webhook
3. Set the webhook URL to: `https://your-server.com/webhook/helius`
4. Set the webhook type to "Enhanced Transactions"
5. Add the account addresses you want to monitor (agent pubkeys)
6. Copy the webhook secret to your `.env` as `HELIUS_WEBHOOK_SECRET`

For local development, use [ngrok](https://ngrok.com/) to expose your local server:

```bash
ngrok http 3001
# Use the ngrok URL as your webhook endpoint
```

---

## Deploying to Devnet

```bash
# Switch to devnet
solana config set --url devnet

# Update Anchor.toml cluster to "devnet"
# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Update program ID everywhere (see step 4 above)
```

---

## API Reference

### Health & Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health, DB/Redis status |
| GET | `/api/stats` | Total agents, avg score, tier distribution |

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | All agents (supports `?tier=Gold` filter) |
| GET | `/api/agents/:pubkey` | Full agent profile with stats |
| POST | `/api/agents/register` | Register new agent, triggers backfill |
| GET | `/api/agents/:pubkey/score` | Current score and tier |
| GET | `/api/agents/:pubkey/history` | Score history over time |
| GET | `/api/agents/:pubkey/txs` | Transaction history (paginated: `?page=1&limit=20`) |
| POST | `/api/agents/:pubkey/attest` | Submit validator attestation |
| POST | `/api/agents/:pubkey/zkproof` | Submit ZK proof record |

### Webhook

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhook/helius` | Helius transaction webhook |

### Response Format

All endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## SDK Usage

### Installation

```bash
npm install @truva-protocol/sdk
```

### Quick Start

```typescript
import { TruvaSDK, TruvaError } from 'truva-sdk';
import { PublicKey } from '@solana/web3.js';

const truva = new TruvaSDK({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  apiUrl: 'http://localhost:3001',
});

// Check agent score (reads from on-chain PDA)
const score = await truva.getAgentScore(agentPubkey);
console.log(score.tier);       // "Gold"
console.log(score.score);      // 87

// Gate a payment — throws TruvaError if insufficient
try {
  await truva.requireTrustTier('Gold', agentPubkey);
  // ✅ Agent meets Gold tier — proceed with payment
} catch (err) {
  if (err instanceof TruvaError) {
    console.log(`Blocked: ${err.currentTier} < ${err.requiredTier}`);
  }
}

// Register a new agent
await truva.register(agentPubkey, payerKeypair);

// Get full profile (from REST API)
const profile = await truva.getAgentProfile(agentPubkey);

// Check eligibility for a specific amount
const eligible = await truva.isEligible(agentPubkey, 'Silver', 50_000_000_000);
```

### SNS Identity — `.sol` Domain Resolution

Truva integrates with [SNS (Solana Name Service)](https://sns.id/) so agents can be looked up by human-readable `.sol` domain names instead of raw public keys:

```typescript
import { TruvaClient } from '@truva-protocol/sdk';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://solana-devnet.rpcfast.com?api_key=YOUR_KEY');
const truva = new TruvaClient(connection);

// Resolve a .sol domain to a PublicKey
const pubkey = await truva.resolveAgent('my-agent.sol');

// Look up trust score by .sol name (one-liner)
const score = await truva.getAgentScoreByName('my-agent.sol');
console.log(`${score.tier} tier — score ${score.score}/100`);

// Works with raw pubkeys too
const score2 = await truva.getAgentScoreByName('7XsJcQk...');
```

---

## Scoring Engine

The reputation engine calculates trust scores from **6 signals**:

| Signal | Weight | Formula |
|--------|--------|---------|
| Transaction Volume | 25 pts | `min(txCount / 100, 1.0) × 25` |
| Success Rate | 25 pts | `(successCount / txCount) × 25` |
| Counterparty Diversity | 20 pts | `min(uniqueCounterparties / 20, 1.0) × 20` |
| Account Age | 15 pts | `min(ageInDays / 60, 1.0) × 15` |
| ZK Proofs | 10 pts | `min(zkProofCount / 5, 1.0) × 10` |
| Validator Attestations | 5 pts | `min(attestationCount / 3, 1.0) × 5` |

**Total Score** = sum of all signals (0-100)

Scoring happens **off-chain** in the reputation engine. Only **tier changes** trigger on-chain PDA updates to save SOL.

---

## Smart Contract Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_passport` | Create a new agent passport PDA (score=0, tier=Bronze) |
| `update_trust_tier` | Authority updates score and auto-derives tier |
| `process_payment_sol` | SOL transfer gated by minimum trust tier |
| `process_payment_spl` | SPL token transfer gated by minimum trust tier |
| `freeze_passport` | Authority freezes a passport (blocks all payments) |
| `unfreeze_passport` | Authority unfreezes a passport |
| `close_passport` | Close passport account and reclaim rent |

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with agent registry preview, leaderboard, and CTA |
| `/dashboard` | Platform dashboard with stats, connected agents, logs |
| `/registry` | Full agent registry with tier/category filters and search |
| `/register` | Multi-step agent registration wizard |
| `/reputation` | Trust score heatmap visualization |
| `/trustgate-logs` | Real-time TrustGate transaction log viewer |
| `/live-demo` | Interactive TrustGate simulation |
| `/validator` | Validator metrics and event logs |
| `/sdk-docs` | SDK documentation with code examples |
| `/agent/[id]` | Individual agent passport detail view |

---

## Key Innovation: TrustGate

The core instruction `process_payment_sol`:

```rust
// 1. Check: passport is not frozen
// 2. Check: agent.trust_tier >= required_tier
// 3. Check: amount <= tier_limit
// 4. Execute: SOL transfer via system_program CPI
// 5. Update: tx_count += 1, success_count += 1
// 6. Emit: PaymentProcessed event
```

This is the **gate nobody else has built**. Any Solana protocol can integrate TrustGate to trust-gate AI agent payments with a single CPI call.

---

## Security

Truva Protocol handles real value transfers on Solana. Security is a core design principle, not an afterthought.

- **Authority-gated access control** on all privileged operations via Anchor's `has_one` constraint
- **Deterministic PDA addressing** preventing duplicate passports per agent
- **Checked arithmetic** on all counter operations to prevent overflow
- **Three-layer payment gating** (frozen check → tier check → amount limit) before any CPI transfer
- **13 passing test cases** covering initialization, authority validation, payment gating, freeze/unfreeze, and account closure

For a detailed breakdown of our security architecture, threat model, and areas requiring formal audit, see **[SECURITY.md](./SECURITY.md)**.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Run the test suite (`anchor test`)
4. Submit a pull request

---

## License

MIT — see [LICENSE](./LICENSE) for details.
