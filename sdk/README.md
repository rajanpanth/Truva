# @truva-protocol/sdk

TypeScript SDK for the **Truva Protocol** — trust-gated AI agent payments on Solana.

- **Browser-safe** — no `fs`, `path`, or `__dirname`. Works in Next.js, React, and workers.
- **Tree-shakeable** — split into focused modules (`/eliza`, `/langchain`).
- **Anchor 1.0** — uses `@anchor-lang/core`.
- **elizaOS + LangChain** — first-class plugins for both frameworks included.

## Install

```bash
npm install @truva-protocol/sdk
```

## Quick Start

```typescript
import { TruvaClient } from 'truva-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const truva = new TruvaClient(connection, {
  apiUrl: 'https://truva.vercel.app',
});

const agentKey = new PublicKey('YOUR_AGENT_PUBKEY');

// Gate a payment — throws TruvaError if tier is insufficient
await truva.requireTrustTier('Gold', agentKey);
```

## Register an Agent

Register an AI agent with the Truva Protocol programmatically:

```typescript
import { TruvaClient } from 'truva-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const truva = new TruvaClient(connection, {
  apiUrl: 'https://truva.vercel.app',
});

// Generate or load your agent's keypair
const agentKeypair = Keypair.generate();

const result = await truva.register({
  name: 'ArbitrageBot_v2',
  public_key: agentKeypair.publicKey.toBase58(),
  operator_name: 'Alice Chen',
  operator_email: 'alice@example.com',
  task_type: 'trading',
  description: 'High-frequency DEX arbitrage agent with cross-protocol MEV',
  max_tx_size: 10000,
  rate_limit: 100,
  chains: ['solana'],
  spending_behavior: 'aggressive',
  metadata: {
    version: '2.0',
    capabilities: ['SWAP_EXECUTION', 'ARBITRAGE_DETECTION'],
  },
});

console.log(`Agent registered!`);
console.log(`  ID:    ${result.id}`);
console.log(`  Name:  ${result.name}`);
console.log(`  Score: ${result.trust_score}`);  // starts at 50
console.log(`  Tier:  ${result.tier}`);          // starts at 1 (Bronze)
```

### RegisterAgentConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | ✅ | Agent name (2–64 chars) |
| `public_key` | `string` | ✅ | Solana base58 address |
| `operator_name` | `string` | ✅ | Operator / team name |
| `operator_email` | `string` | ✅ | Contact email |
| `task_type` | `TaskType` | ✅ | `trading`, `yield`, `data`, `execution`, `risk`, `treasury`, `monitoring`, `payment` |
| `max_tx_size` | `number` | ✅ | Max transaction size per epoch |
| `rate_limit` | `number` | ✅ | Max transactions per hour |
| `chains` | `SupportedChain[]` | ✅ | `solana`, `ethereum`, `base`, `arbitrum` |
| `description` | `string` | — | Description (max 500 chars) |
| `spending_behavior` | `SpendingBehavior` | — | `conservative`, `standard`, `aggressive` |
| `metadata` | `object` | — | Any JSON-serializable metadata |

## Agent Vaults

An owner funds a vault for an agent and sets limits. The agent can only spend through the program.

```ts
import {
  createVaultIx, vaultPayIx, setVaultPausedIx, deriveVaultPDA, deriveAssociatedTokenAddress,
} from "@truva-protocol/sdk";

// Owner: 1 USDC per payment, 20 USDC per day, one allowed recipient
const ix = createVaultIx(owner, agent, USDC_MINT, {
  perTxLimit: 1_000_000n,
  dailyLimit: 20_000_000n,
  allowlist: [sellerWallet],
});
// Fund it with a normal token transfer to:
const [vault] = deriveVaultPDA(owner, agent, USDC_MINT);
const vaultToken = deriveAssociatedTokenAddress(USDC_MINT, vault);

// Agent: pay a recipient (its token account must exist)
const pay = vaultPayIx(owner, agent, USDC_MINT, sellerWallet, 500_000n);

// Owner: stop the agent
const pause = setVaultPausedIx(owner, agent, USDC_MINT, true);

// Anyone: read limits, spend so far and balance
const state = await truva.getVault(owner, agent, USDC_MINT);
```

Builders return plain `TransactionInstruction`s. Vaults hold classic SPL tokens (not Token-2022).

## x402-style Paywall

Seller (Express or Node `http`). Each request costs `amount`; the middleware answers 402, verifies the agent's `vault_pay` transaction, submits it and calls `next()` once it is confirmed:

```ts
import { truvaPaywall } from "@truva-protocol/sdk";

app.get("/report",
  truvaPaywall({ connection, payTo: sellerWallet, mint: USDC_MINT, amount: 1_000_000, minTier: "Silver" }),
  (req, res) => res.json({ report: "...", paidBy: req.truvaPayment.payer }));
```

Agent. `fetchWithVault` pays the challenge from the vault and retries once; it throws `PaymentRejectedError` if the price is above `maxAmount` or the payment is refused:

```ts
import { fetchWithVault, PaymentRejectedError } from "@truva-protocol/sdk";

try {
  const res = await fetchWithVault(url, undefined, {
    connection, agent: agentKeypair, vaultOwner: owner, maxAmount: 1_000_000,
  });
} catch (err) {
  if (err instanceof PaymentRejectedError) console.log(err.reason); // e.g. "ExceedsDailyLimit"
}
```

The scheme name is `truva-vault`. It uses the x402 handshake but is not the stock `exact` scheme, and the seller settles the transaction itself rather than through a facilitator.

## elizaOS Plugin

Drop the plugin into any elizaOS `AgentRuntime`. It adds two capabilities:

- **`TRUVA_VERIFY_TRUST`** action — verifies trust tier before any financial operation
- **`TRUVA_TRUST_STATUS`** provider — injects live score + tier into context window

```typescript
import { truvaPlugin } from 'truva-sdk/eliza';
import { AgentRuntime } from '@elizaos/core';

const runtime = new AgentRuntime({
  plugins: [truvaPlugin],
  settings: {
    SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  },
});
```

The plugin reads `SOLANA_RPC_URL` from `runtime.getSetting()`. Set it via your elizaOS config or `.env`.

## LangChain Tool

Works with any LangChain agent (GPT-4, Claude, Gemini).

```typescript
import { createTruvaTool } from 'truva-sdk/langchain';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const tools = [createTruvaTool(truva)];
const agent = createReactAgent({ llm, tools });

// The LLM will automatically call truva_trust_check before financial ops.
```

Tool schema:

```typescript
{
  name: 'truva_trust_check',
  schema: {
    tier:        'Bronze' | 'Silver' | 'Gold' | 'Platinum',
    agentPubkey: string,  // Solana public key
    amount?:     number,  // lamports (optional)
  }
}
// Returns: { status: 'PASS' | 'FAIL', tier, message, code?, action? }
```

## Headless Agent Wallet

For autonomous server-side agents that sign transactions without user interaction.

```typescript
import { AgentWallet } from 'truva-sdk';

// Load from env (JSON array of 64 bytes — standard solana-keygen format)
const wallet = AgentWallet.fromEnv('AGENT_PRIVATE_KEY');
const client = wallet.createClient(truva);

// Or generate ephemeral
const ephemeral = AgentWallet.generate();
```

## API Reference

### `new TruvaClient(connection, config?)`

| Config field | Type     | Default                   | Description                     |
|--------------|----------|---------------------------|---------------------------------|
| `apiUrl`     | `string` | `"http://localhost:3001"` | Truva API base URL              |
| `commitment` | `string` | `"confirmed"`             | Solana commitment level         |
| `wallet`     | `Wallet` | —                         | Signer for write operations     |

### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `register(config)` | `RegisterAgentResult` | Register a new agent with the protocol |
| `requireTrustTier(tier, pubkey)` | `void` | Throws `TruvaError` if agent doesn't qualify |
| `getAgentScore(pubkey)` | `AgentPassportData` | Raw on-chain PDA data |
| `getAgentProfile(pubkey)` | `AgentProfile` | Full profile from REST API |
| `isEligible(pubkey, tier, lamports)` | `boolean` | Check tier + amount limit |
| `getScoreHistory(pubkey)` | `ScoreHistory[]` | Historical score snapshots |

### `derivePassportPDA(agentPubkey, programId?)`

Derive the on-chain Passport PDA address for any agent.

```typescript
import { derivePassportPDA } from 'truva-sdk';

const [pda, bump] = derivePassportPDA(agentKey);
```

## Trust Tiers

| Tier     | Score Range | Max Payment (lamports) | Max Payment (SOL) |
|----------|-------------|------------------------|--------------------|
| Bronze   | 0–49        | 5,000,000,000          | 5 SOL              |
| Silver   | 50–79       | 100,000,000,000        | 100 SOL            |
| Gold     | 80–94       | unlimited              | unlimited          |
| Platinum | 95–100      | unlimited              | unlimited          |

## Error Handling

```typescript
import { TruvaClient, TruvaError, InsufficientTierError, AgentFrozenError } from 'truva-sdk';

try {
  await truva.requireTrustTier('Gold', agentKey);
} catch (err) {
  if (err instanceof AgentFrozenError) {
    console.log('Agent is frozen — contact governance');
  } else if (err instanceof InsufficientTierError) {
    console.log(`Need ${err.requiredTier}, have ${err.actualTier}`);
  } else if (err instanceof TruvaError) {
    console.log(err.code, err.message);
  }
}
```

## Trust-Gated Middleware

Wrap any async function with a trust-tier check:

```typescript
import { AgentWallet, wrapWithTrustGate } from 'truva-sdk';

const gatedTransfer = wrapWithTrustGate(truva, agentKey, 'Silver', transfer);
await gatedTransfer(recipient, amountLamports);
// Throws TruvaError before `transfer` is called if agent < Silver
```

## Constants

```typescript
import { TRUSTGATE_PROGRAM_ID, TIER_RANK, TIER_LIMITS_LAMPORTS } from 'truva-sdk';

TIER_RANK['Gold']              // 2
TIER_LIMITS_LAMPORTS['Bronze'] // 5_000_000_000
```

## Program ID (Devnet)

```
BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5
```

Override: `TRUVA_PROGRAM_ID=<your-id>` environment variable.

## Sub-path Exports

| Import path | Contents |
|---|---|
| `truva-sdk` | Core: `TruvaClient`, `AgentWallet`, errors, types, constants |
| `truva-sdk/eliza` | elizaOS plugin: `truvaPlugin` |
| `truva-sdk/langchain` | LangChain tool: `createTruvaTool` |

## License

MIT — [truva-x.tech](https://truva-x.tech)
