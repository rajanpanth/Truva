# Truva Protocol

[![Solana](https://img.shields.io/badge/Solana-Devnet-blue)](https://explorer.solana.com/address/BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-v0.30+-purple)](https://www.anchor-lang.com/)
[![Tests](https://img.shields.io/badge/Tests-51%20Passing-brightgreen)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Spending policy and trust enforcement for AI agent payments on Solana.**

The [Solana Agent Registry](https://solana.com/agent-registry) says who an agent is. Truva decides what it may spend. An owner funds an on-chain **Agent Vault** with limits; the agent can only pay through the TrustGate program, which checks the owner's limits, the agent's **Passport** (trust score 0-100, tier Bronze → Silver → Gold) and the seller's minimum tier on every payment. It plugs into HTTP 402 (x402-style) paywalls, so an agent can buy from paid APIs without ever holding the funds itself.

> **Program ID:** `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5`
> **Network:** Solana Devnet · **Framework:** Anchor · **Language:** Rust + TypeScript

## Key Features

- **🏦 Agent Vaults** — Owner-funded, program-owned token accounts. The agent key can only spend through `vault_pay`, within a per-payment limit, a daily limit and an optional recipient allowlist. The owner can pause, withdraw or close at any time.
- **🛡️ TrustGate** — Every payment checks the agent's passport on-chain. Other programs can run the same check with one CPI to `verify_trust`.
- **🧾 Merchant Policy** — A seller sets the minimum tier it accepts. Payments must pass the seller's policy account, so the paying agent cannot lower or skip it.
- **💸 x402-style Paywall** — SDK middleware answers HTTP 402, verifies the agent's `vault_pay` transaction, settles it and serves the resource. A matching `fetchWithVault` client pays automatically, with its own price cap.
- **🪪 Agent Passports** — PDA per agent with score, tier, transaction counts and a freeze flag. Only the protocol scorer can set scores; nobody can score themselves.
- **🔎 Score Provenance** — Each score can be written with the SHA-256 of its inputs, the scoring model version and the agent's Solana Agent Registry ID, so anyone can recompute and check it.
- **🗳️ Scorer Committee** — The admin can hand scoring to an M-of-N committee: members vote on the same published inputs and the program writes the median. No single key can then set a score.
- **📊 6-Signal Scoring Engine** — Off-chain scoring from transaction volume, success rate, counterparty diversity, account age, Solana Agent Registry feedback, and validator attestations.
- **🧊 Kill Switch** — The scorer can freeze a passport, blocking every payment. A risk monitor can do it automatically when an agent's activity looks compromised.
- **🔌 SDK & Integrations** — TypeScript SDK (pure `@solana/web3.js`) with Eliza plugin, LangChain tool and MCP server.
- **📡 Real-Time Indexing** — Helius webhook integration for transaction monitoring and score recalculation.

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
│  │    initialize_config   → set protocol scorer        │ │
│  │    initialize_passport → create new passport        │ │
│  │    update_trust_tier   → scorer sets score/tier     │ │
│  │    verify_trust        → CPI trust check            │ │
│  │    set_merchant_policy → seller's minimum tier      │ │
│  │    create_vault        → owner sets spend limits    │ │
│  │    vault_pay           → policy-enforced payment    │ │
│  │    process_payment_*   → trust-gated direct payment │ │
│  │    freeze_passport     → block all payments         │ │
│  └─────────────────────────────────────────────────────┘ │
│  Accounts: ProtocolConfig · AgentPassport ·              │
│            MerchantPolicy · AgentVault                   │
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
| Gold   | 80-100 | Full DeFi, unlimited    | ≥30 txs, ≥90% success, ≥10 counterparties, ≥2 attestations, Agent Registry feedback averaging ≥60 |

The tier is decided off-chain from all signals and written on-chain together with the score. An agent with three or more Agent Registry feedbacks averaging below 30 is held at Bronze. The "Access Level" amounts are the caps on direct SOL payments (`process_payment_sol`); vault payments are capped by the vault owner's limits.

---

## Agent Vaults and the x402 Paywall

```
Owner ──create_vault(limits)──▶ AgentVault PDA ◀── holds the tokens
Agent ──GET /report──────────▶ Seller API
      ◀─402 + requirements───
      ──X-PAYMENT: signed vault_pay tx──▶ Seller verifies, submits, confirms
      ◀─200 + resource───────           TrustGate enforces at settlement:
                                         vault not paused · passport trusted and
                                         not frozen · seller's minimum tier ·
                                         per-payment limit · daily limit · allowlist
```

Seller (Express or bare Node `http`):

```typescript
import { truvaPaywall } from '@truva-protocol/sdk';

app.get('/report',
  truvaPaywall({ connection, payTo: sellerWallet, mint: USDC, amount: 1_000_000, minTier: 'Silver' }),
  (req, res) => res.json({ report: '...' }));
```

Agent:

```typescript
import { fetchWithVault } from '@truva-protocol/sdk';

const res = await fetchWithVault('https://api.example.com/report', undefined, {
  connection, agent: agentKeypair, vaultOwner: ownerWallet,
  maxAmount: 1_000_000, // never pay more than 1 USDC per call
});
```

Owner:

```typescript
import { createVaultIx, setVaultPausedIx } from '@truva-protocol/sdk';

createVaultIx(owner, agent, USDC, {
  perTxLimit: 1_000_000, dailyLimit: 20_000_000, allowlist: [sellerWallet],
});
setVaultPausedIx(owner, agent, USDC, true); // stop the agent immediately
```

The payment scheme is `truva-vault`. It follows the x402 handshake (402 response with `accepts`, `X-PAYMENT` request header, `X-PAYMENT-RESPONSE` receipt) but is not x402's stock `exact` scheme: the payment is a `vault_pay` instruction rather than a plain token transfer, and the seller settles it directly instead of through a third-party facilitator. Vaults hold SPL Token and Token-2022 mints (transfer hooks are not supported). Sellers that do not need trust gating can also accept the standard `exact` scheme through a facilitator; see the [SDK README](./sdk/README.md).

Run the whole flow locally:

```bash
npm run demo:x402
```

---

## Project Structure

```
truva/
├── programs/trustgate/         # Solana Anchor program (Rust)
│   └── src/
│       ├── lib.rs              # Program entry + 20 instructions
│       ├── state/
│       │   ├── mod.rs
│       │   ├── config.rs       # ProtocolConfig (admin, scorer)
│       │   ├── passport.rs     # AgentPassport account + TrustTier enum + events
│       │   ├── merchant.rs     # MerchantPolicy (recipient's minimum tier)
│       │   └── vault.rs        # AgentVault (limits, spend window, allowlist)
│       ├── instructions/
│       │   ├── mod.rs
│       │   ├── config.rs
│       │   ├── initialize_passport.rs
│       │   ├── adopt_passport.rs
│       │   ├── verify_trust.rs
│       │   ├── merchant_policy.rs
│       │   ├── vault.rs
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
│   │   │   ├── scorer.ts       # Gathers signals, recalculates, writes on-chain
│   │   │   ├── score-rules.ts  # 6-signal score and tier rules
│   │   │   ├── agent-registry.ts # Solana Agent Registry reputation lookup
│   │   │   ├── risk-monitor.ts # Automatic kill switch
│   │   │   ├── risk-rules.ts   # Anomaly detection rules
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
│   └── src/
│       ├── client.ts           # TruvaClient (reads, trust checks)
│       ├── instructions.ts     # Instruction builders + account parsers
│       └── x402.ts             # truvaPaywall, fetchWithVault
├── scripts/
│   ├── seedAgents.ts           # Seed 10 demo agents
│   └── simulateTransactions.ts # Simulate 50 txs for testing
├── tests/
│   ├── trustgate.test.ts       # Program test suite (42 tests)
│   └── x402.test.ts            # End-to-end paywall tests (9 tests)
├── demos/
│   └── x402-vault-paywall.ts   # Narrated agent-buys-from-API demo
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

After deploying, create the protocol config once with the upgrade-authority wallet, passing the key your backend signs score updates with (`BACKEND_AUTHORITY_KEY`) as the scorer (`initialize_config`). Passports created before the config existed must be adopted by the scorer (`adopt_passport`) before they pass the gate.

Update the program ID in:
- `Anchor.toml` (both localnet and devnet)
- `programs/trustgate/src/lib.rs` (`declare_id!`)
- `sdk/src/index.ts` (`TRUSTGATE_PROGRAM_ID`)
- `backend/reputation-engine/.env` (`TRUVA_PROGRAM_ID`)

### 5. Run Tests

```bash
anchor test
```

The suite (51 tests) covers the config, passports, trust checks, merchant policy, direct payments, agent vaults and the end-to-end x402 paywall in `tests/x402.test.ts`. `Anchor.toml` sets `[test] upgradeable = true` because `initialize_config` checks the program's upgrade authority.

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
| POST | `/api/agents/:pubkey/zkproof` | Store a proof hash (recorded only; not used for scoring) |

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
import { TruvaClient, TruvaError } from '@truva-protocol/sdk';
import { Connection } from '@solana/web3.js';

const truva = new TruvaClient(new Connection(rpcUrl), { apiUrl: 'http://localhost:3001' });

// Check agent score (reads the on-chain passport)
const score = await truva.getAgentScore(agentPubkey);
console.log(score.tier);     // "Gold"
console.log(score.score);    // 87
console.log(score.trusted);  // false if the score was not set by the protocol scorer

// Gate a call — throws TruvaError if untrusted, frozen or below the tier
try {
  await truva.requireTrustTier('Gold', agentPubkey);
} catch (err) {
  if (err instanceof TruvaError) {
    console.log(`Blocked: ${err.currentTier} < ${err.requiredTier}`);
  }
}

// What a seller requires, and what an agent can still spend
const minTier = await truva.getMerchantMinTier(sellerWallet);
const vault = await truva.getVault(ownerWallet, agentPubkey, mint);
console.log(vault?.dailyLimit, vault?.spentInWindow, vault?.balance);

// Full profile (from the REST API)
const profile = await truva.getAgentProfile(agentPubkey);
```

Instruction builders (`createVaultIx`, `vaultPayIx`, `setMerchantPolicyIx`, `verifyTrustIx`, ...) return plain `TransactionInstruction`s, so they work with any wallet or agent framework.

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
| Agent Registry Reputation | 10 pts | `min(feedbacks / 5, 1.0) × (averageScore / 100) × 10` |
| Validator Attestations | 5 pts | `min(attestationCount / 3, 1.0) × 5` |

**Total Score** = sum of all signals (0-100)

Scoring happens **off-chain** in the reputation engine. Only **tier changes** trigger on-chain PDA updates to save SOL.

### Score provenance

Every on-chain score update carries where the score came from. The engine serialises the agent, the model version and the seven inputs above into one canonical JSON text, hashes it with SHA-256, and sends `attest_score` (hash, model version, the agent's Agent Registry asset) together with `update_trust_tier` in a single transaction. The same text is stored in `score_history.inputs` and returned by `GET /api/agents/:pubkey/history`, so anyone can hash it, compare it with the on-chain record, and re-run the rules in `score-rules.ts`. The hash is a commitment by the scorer, not a proof: the program does not check the inputs. Requires database migration `004_score_provenance.sql`.

### Solana Agent Registry

Signal 5 is read from the [Solana Agent Registry](https://solana.com/agent-registry) (the ERC-8004 identity and feedback registry on Solana) with the `8004-solana` SDK. The engine looks up the registry identity linked to the agent's wallet and uses its feedback count and average score. Lookups are read-only, cached per agent for an hour, and skipped if the SDK is not installed. Configure with `AGENT_REGISTRY_CLUSTER` and `AGENT_REGISTRY_RPC_URL`.

### Risk Monitor (automatic kill switch)

After each webhook batch the engine checks every affected agent's last 10 minutes of activity for a transaction burst, payments sprayed across many counterparties, or a failure spike. If `AUTO_FREEZE_ENABLED=true`, an anomalous agent's passport is frozen on-chain, which blocks all of its payments (including vault payments) until the scorer unfreezes it. Thresholds are set with the `RISK_*` variables in `.env.example`.

---

## Smart Contract Instructions

| Instruction | Signer | Description |
|-------------|--------|-------------|
| `initialize_config` | Upgrade authority | Create the protocol config and set the scorer |
| `update_config` | Admin | Rotate the scorer or hand over admin |
| `initialize_passport` | Anyone (payer) | Create an agent passport (score 0, Bronze). Authority is always the scorer |
| `adopt_passport` | Scorer | Bring an older or rotated passport under the current scorer with an explicit score and tier |
| `update_trust_tier` | Scorer | Set score and tier |
| `attest_score` | Scorer | Set the score (tier is derived) and record its provenance: inputs hash, model version, Agent Registry ID |
| `set_committee` | Admin | Create or replace the M-of-N scorer committee. It takes over once `update_config` sets the scorer to the committee PDA |
| `committee_vote` | Committee member | Vote on an agent's score; at the threshold the program writes the median and the provenance |
| `committee_set_frozen` | Committee member (freeze) / Admin (unfreeze) | Kill switch when the committee is the scorer |
| `verify_trust` | None | Read-only trust check for CPI. Returns `[score, tier]` |
| `set_merchant_policy` / `close_merchant_policy` | Recipient | Set or remove the minimum tier the recipient accepts |
| `create_vault` | Owner | Create a vault for one agent and one mint with limits and an allowlist |
| `update_vault_policy` / `set_vault_paused` | Owner | Change limits and allowlist; pause or resume |
| `vault_pay` | Agent | Pay from the vault, enforced by the program |
| `vault_withdraw` / `close_vault` | Owner | Withdraw; return the balance and close |
| `process_payment_sol` / `process_payment_spl` | Agent | Direct transfer from the agent's own wallet, gated by tier and merchant policy |
| `freeze_passport` / `unfreeze_passport` | Scorer | Block or re-enable all payments for an agent |
| `migrate_passport` / `close_passport` | Scorer | Layout migration; close and reclaim rent |

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

## How Enforcement Works

A trust check only matters if the agent cannot route around it. Truva enforces at two points:

1. **The funds are not the agent's.** They sit in a token account owned by the vault PDA. The only instruction that moves them for the agent is `vault_pay`:

```rust
// 1. Check: vault is not paused by its owner
// 2. Check: passport is scored by the protocol scorer and not frozen
// 3. Check: agent tier >= the recipient's merchant policy
// 4. Check: recipient is on the allowlist (if one is set)
// 5. Check: amount <= per-payment limit, window total <= daily limit
// 6. Execute: SPL transfer signed by the vault PDA
// 7. Update: vault spend counters, passport tx counts
// 8. Emit: VaultPayment event
```

2. **The tier is not the agent's to choose.** Scores are only accepted from the protocol scorer, and the required tier comes from the recipient's own policy account, whose address the program derives and verifies.

Direct payments from an agent's own wallet (`process_payment_sol` / `process_payment_spl`) apply the same passport and merchant-policy checks, but an agent holding its own funds could also transfer them without TrustGate. Use vaults when enforcement has to hold.

---

## Security

Truva Protocol handles real value transfers on Solana. Security is a core design principle, not an afterthought.

- **Scores cannot be self-assigned** — a passport only passes the gate if its authority is the protocol scorer held in the config account, and only the program's upgrade authority can create that config
- **Program-owned funds** — vault tokens can only move through `vault_pay` (agent, within limits) or `vault_withdraw` / `close_vault` (owner)
- **Recipient-controlled tier** — the merchant policy PDA is derived and verified by the program, so it cannot be substituted or omitted
- **Deterministic PDA addressing** for config, passports, merchant policies and vaults
- **Checked arithmetic** on all counters and spend totals
- **70 passing tests** covering authority checks, spoofing attempts, every vault limit, pause, freeze, Token-2022 vaults, score provenance, the scorer committee, and the end-to-end x402 paywall

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
