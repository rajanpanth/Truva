# 🛡️ Agent Passport

**The Solana-native programmable trust gate for AI agent payments.**

> Verify WHO an agent is · Evaluate WHAT it has done · Enforce WHETHER it can pay

Built for **Colosseum Frontier Hackathon 2026**.

---

## 🎯 Problem

AI agents are making payments on-chain — but there's **no way to verify trust** before execution. Any agent can call any function. There's no gate. No reputation. No accountability.

## 💡 Solution

**Agent Passport** introduces the first **TrustGate**: a Solana smart contract that blocks or allows payments based on an agent's verified trust tier.

```
Agent wants to pay → TrustGate checks passport → Tier sufficient? → ✅ Execute : ❌ Block
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  Dashboard · Agent Detail · TrustGate Demo               │
├─────────────────────────────────────────────────────────┤
│                      SDK LAYER                           │
│  requireTrustTier() · getAgentPassport() · derivePassportPDA()│
├─────────────────────────────────────────────────────────┤
│              SOLANA PROGRAM (Anchor/Rust)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Initialize   │  │ Update Trust │  │ Process Payment│  │
│  │ Passport     │  │              │  │ + Trust Check  │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                          │
│  PDA: [passport, agent_pubkey]                           │
│  State: agent_pubkey | trust_score | trust_tier | txns   │
├─────────────────────────────────────────────────────────┤
│              REPUTATION ENGINE (Backend)                  │
│  Scorer: tx_count + success_rate → score (0-100) → tier  │
└─────────────────────────────────────────────────────────┘
```

### Trust Tiers

| Tier   | Score   | Color  | Access Level             |
|--------|---------|--------|--------------------------|
| Bronze | 0–49    | 🟠 Gray | Basic ops, $5K limit     |
| Silver | 50–79   | 🔵 Blue | Standard flows, $100K    |
| Gold   | 80–100  | 🟡 Gold | Full DeFi access, $1M+   |

---

## 📁 Project Structure

```
agent-passport/
├── programs/trustgate/         # Solana Anchor program (Rust)
│   └── src/
│       ├── lib.rs              # Program entry + instruction dispatch
│       ├── instructions/       # initialize, update, process_payment
│       ├── state/              # AgentPassport account + TrustTier enum
│       └── errors.rs           # Custom error codes
├── app/                        # Next.js 14 frontend
│   ├── app/                    # Pages: dashboard, agent detail, demo
│   ├── components/             # AgentCard, TrustBadge, Navbar, StatsBar
│   ├── lib/                    # Solana connection + mock data
│   └── hooks/                  # useTrustGate hook
├── sdk/                        # Developer SDK (requireTrustTier)
├── backend/reputation-engine/  # Trust score calculator
├── scripts/                    # seedAgents.ts, simulateTransactions.ts
├── tests/                      # Anchor test suite
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) + Cargo
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (v0.30+)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) or npm

### 1. Clone & Install

```bash
git clone <repo-url> agent-passport
cd agent-passport
npm install
cd app && npm install && cd ..
```

### 2. Build the Anchor Program

```bash
# Start local validator
solana-test-validator

# In another terminal
anchor build
anchor deploy
```

After deploy, update the program ID in:
- `Anchor.toml`
- `programs/trustgate/src/lib.rs` (`declare_id!`)
- `sdk/src/index.ts`
- `app/lib/solana.ts`

### 3. Run Tests

```bash
anchor test
```

Expected output:
```
TrustGate
  initialize_passport
    ✓ creates a Bronze passport
    ✓ creates a Gold passport
    ✓ rejects invalid trust score > 100
  update_trust
    ✓ updates trust score and tier
  process_payment_with_trust_check
    ✓ allows Gold agent through Gold gate
    ✓ blocks Bronze agent from Gold gate
    ✓ allows Bronze agent through Bronze gate
```

### 4. Seed Demo Agents

```bash
npx ts-node scripts/seedAgents.ts
```

Seeds:
- **Agent A** → Bronze (score: 35)
- **Agent B** → Gold (score: 92)

### 5. Run Simulation

```bash
npx ts-node scripts/simulateTransactions.ts
```

Output:
```
TEST 1: Agent A (Bronze) → Gold Gate    → ❌ BLOCKED
TEST 2: Agent B (Gold)   → Gold Gate    → ✅ PASSED
TEST 3: Agent A (Bronze) → Bronze Gate  → ✅ PASSED
```

### 6. Start Frontend

```bash
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Pages:
- `/` — Dashboard with agent registry
- `/agent/[pubkey]` — Agent detail + transaction history
- `/demo` — Interactive TrustGate demo

---

## 🔑 Key Innovation: TrustGate

The core instruction `process_payment_with_trust_check`:

```rust
// Fetch agent's passport PDA
// Check: agent.trust_tier >= required_tier
// If insufficient → Error::InsufficientTrust (tx reverted)
// If sufficient → Execute SOL transfer + increment tx count
```

This is the **gate nobody else has built**. Any Solana protocol can integrate this to trust-gate AI agent payments with a single CPI call.

### SDK Usage

```typescript
import { requireTrustTier } from '@agent-passport/sdk';

// One line to gate any payment
await requireTrustTier('Gold', agentPublicKey, connection, program);
// ✅ Passes → continue with payment
// ❌ Throws → agent doesn't meet tier
```

---

## 🎬 Demo Script (Judges)

1. Open dashboard at `localhost:3000` → See all agents with tiers
2. Click any agent → View passport details + transaction history
3. Go to `/demo` → Select **Guard Proto (Bronze)** + **Gold gate** → Click "Attempt Payment" → **❌ BLOCKED**
4. Select **TradeBot X (Gold)** + **Gold gate** → Click "Attempt Payment" → **✅ PASSED**
5. Show terminal: `npx ts-node scripts/simulateTransactions.ts` → Real on-chain trust gate in action

---

## 🧠 Reputation Engine

Simplified scoring formula:

```
volume   = min(tx_count, 200) / 200 × 40   → max 40 pts
reliability = success_rate × 60              → max 60 pts
score    = volume + reliability              → 0-100
```

| Score Range | Tier   |
|-------------|--------|
| 0–49        | Bronze |
| 50–79       | Silver |
| 80–100      | Gold   |

---

## 🧾 Assumptions

- Trust scores are seeded via authority (in production: computed from indexed on-chain data via Helius webhooks)
- ZK proof layer and cross-chain bridge are documented in architecture but mocked for hackathon scope
- Frontend uses mock data that mirrors on-chain state; full wallet integration ready for devnet demo
- Payments are simple SOL transfers; extensible to SPL tokens via CPI

---

## 🛣️ Roadmap

- [ ] SPL token payment support
- [ ] Helius webhook integration for real-time reputation indexing
- [ ] ZK proof of task completion (RISC Zero / Groth16)
- [ ] Cross-chain passport portability (ERC-8004)
- [ ] DAO governance for tier thresholds
- [ ] Agent-to-agent hiring marketplace

---

## 👥 Team

Built with ❤️ for the Colosseum Frontier Hackathon 2026.

---

## 📄 License

MIT
