# @truva/solana

TypeScript SDK for the **Truva Protocol** — trust-gated AI agent payments on Solana.

- **Browser-safe** — no `fs`, `path`, or `__dirname`. Works in Next.js, React, and workers.
- **Tree-shakeable** — split into focused modules (`/eliza`, `/langchain`).
- **Anchor 1.0** — uses `@anchor-lang/core`.
- **elizaOS + LangChain** — first-class plugins for both frameworks included.

## Install

```bash
npm install @truva/solana
```

## Quick Start

```typescript
import { TruvaClient } from '@truva/solana';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const truva = new TruvaClient(connection);

const agentKey = new PublicKey('YOUR_AGENT_PUBKEY');

// Gate a payment — throws TruvaError if tier is insufficient
await truva.requireTrustTier('Gold', agentKey);
```

## elizaOS Plugin

Drop the plugin into any elizaOS `AgentRuntime`. It adds two capabilities:

- **`TRUVA_VERIFY_TRUST`** action — verifies trust tier before any financial operation
- **`TRUVA_TRUST_STATUS`** provider — injects live score + tier into context window

```typescript
import { truvaPlugin } from '@truva/solana/eliza';
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
import { createTruvaTool } from '@truva/solana/langchain';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const tools = [createTruvaTool(connection)];
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
import { AgentWallet } from '@truva/solana';

// Load from env (JSON array of 64 bytes — standard solana-keygen format)
const wallet = AgentWallet.fromEnv('AGENT_PRIVATE_KEY');
const client = wallet.createClient(connection);

// Or generate ephemeral
const ephemeral = AgentWallet.generate();
```

## API Reference

### `new TruvaClient(connection, config?)`

| Config field | Type            | Default                   | Description                           |
|--------------|-----------------|---------------------------|---------------------------------------|
| `wallet`     | `WalletAdapter` | `undefined`               | Signer wallet (write operations only) |
| `apiUrl`     | `string`        | `"http://localhost:3001"` | Reputation engine REST base URL       |
| `commitment` | `Commitment`    | `"confirmed"`             | Solana commitment level               |

### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `requireTrustTier(tier, pubkey)` | `void` | Throws `TruvaError` if agent doesn't qualify |
| `getAgentScore(pubkey)` | `AgentPassportData` | Raw on-chain PDA data |
| `getAgentProfile(pubkey)` | `AgentProfile` | Full profile from REST API |
| `isEligible(pubkey, tier, lamports)` | `boolean` | Check tier + amount limit |
| `register(pubkey)` | `string` | Register a new agent |
| `getScoreHistory(pubkey)` | `ScoreHistory[]` | Historical score snapshots |

### `derivePassportPDA(agentPubkey, programId?)`

Derive the on-chain Passport PDA address for any agent.

```typescript
import { derivePassportPDA } from '@truva/solana';

const [pda, bump] = derivePassportPDA(agentKey);
```

## Trust Tiers

| Tier     | Score Range | Max Payment (lamports) | Max Payment (SOL) |
|----------|-------------|------------------------|-------------------|
| Bronze   | 0–49        | 5,000,000,000          | 5 SOL             |
| Silver   | 50–79       | 100,000,000,000        | 100 SOL           |
| Gold     | 80–94       | unlimited              | unlimited         |
| Platinum | 95–100      | unlimited              | unlimited         |

## Error Handling

```typescript
import { TruvaClient, TruvaError, InsufficientTierError, AgentFrozenError } from '@truva/solana';

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
import { AgentWallet, wrapWithTrustGate } from '@truva/solana';

const gatedTransfer = wrapWithTrustGate(client, agentKey, 'Silver', transfer);
await gatedTransfer(recipient, amountLamports);
// Throws TruvaError before `transfer` is called if agent < Silver
```

## Constants

```typescript
import { TRUSTGATE_PROGRAM_ID, TIER_RANK, TIER_LIMITS_LAMPORTS } from '@truva/solana';

TIER_RANK['Gold']              // 2
TIER_LIMITS_LAMPORTS['Bronze'] // 5_000_000_000n
```

## Program ID (Devnet)

```
BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5
```

Override: `TRUVA_PROGRAM_ID=<your-id>` environment variable.

## Sub-path Exports

| Import path | Contents |
|---|---|
| `@truva/solana` | Core: `TruvaClient`, `AgentWallet`, errors, types, constants |
| `@truva/solana/eliza` | elizaOS plugin: `truvaPlugin` |
| `@truva/solana/langchain` | LangChain tool: `createTruvaTool` |

## Backward Compatibility

`Truva` is an alias for `TruvaClient` — will be removed in v1.0.

```typescript
// Deprecated — use TruvaClient
import { Truva } from '@truva/solana';
```

## License

MIT — [truva-x.tech](https://truva-x.tech)


- **Browser-safe** — no `fs`, `path`, or `__dirname`. Works in Next.js, React, and workers.
- **Tree-shakeable** — split into focused modules.
- **Anchor 1.0** — uses `@anchor-lang/core`.

## Install

```bash
npm install @truva/sdk
```

## Quick Start

```typescript
import { TruvaClient, TruvaError, derivePassportPDA } from "@truva/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");

// Config-object constructor — all fields optional
const client = new TruvaClient(connection, {
  apiUrl: "http://localhost:3001", // default
  commitment: "confirmed",         // default
  // wallet: myWallet,             // only needed for write operations
});

// Read trust score directly from on-chain PDA
const agentKey = new PublicKey("5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo");
const score = await client.getAgentScore(agentKey);
console.log(score.tier);  // "Gold"
console.log(score.score); // 87

// Gate a payment — throws TruvaError if tier is insufficient
await client.requireTrustTier("Gold", agentKey);
```

## API

### `new TruvaClient(connection, config?)`

| Config field  | Type         | Default                    | Description                             |
|---------------|--------------|----------------------------|-----------------------------------------|
| `wallet`      | `WalletAdapter` | `undefined`             | Signer wallet (write operations only)   |
| `apiUrl`      | `string`     | `"http://localhost:3001"`  | Reputation engine REST base URL         |
| `commitment`  | `Commitment` | `"confirmed"`              | Solana commitment level                 |

### `getAgentScore(agentPubkey)` → `AgentPassportData`

Read trust data directly from the on-chain Passport PDA. Pure `@solana/web3.js`, no Anchor IDL needed.

```ts
const { score, tier, txCount, successRate, frozen } = await client.getAgentScore(agentKey);
```

### `requireTrustTier(requiredTier, agentPubkey)` → `void`

Throws `TruvaError` if the agent doesn't meet the required tier or the passport is frozen.

### `register(agentPubkey)` → `string`

Register a new agent via the REST API.

### `getAgentProfile(agentPubkey)` → `AgentProfile`

Full profile from the reputation engine REST API.

### `getScoreHistory(agentPubkey)` → `ScoreHistory[]`

Historical score snapshots.

### `isEligible(agentPubkey, tier, amountLamports)` → `boolean`

Check if agent qualifies for a payment.
`amountLamports` is in **lamports** (1 SOL = 1 000 000 000 lamports).

### `derivePassportPDA(agentPubkey, programId?)` → `[PublicKey, number]`

Derive the Passport PDA address for any agent public key.

## Trust Tiers

| Tier     | Score Range | Max Payment (lamports) | Max Payment (SOL) |
|----------|-------------|------------------------|-------------------|
| Bronze   | 0–49        | 5 000 000 000          | 5 SOL             |
| Silver   | 50–79       | 100 000 000 000        | 100 SOL           |
| Gold     | 80–94       | unlimited              | unlimited         |
| Platinum | 95–100      | unlimited              | unlimited         |

## Error Handling

```typescript
import { TruvaClient, TruvaError } from "@truva/sdk";

try {
  await client.requireTrustTier("Gold", agentKey);
} catch (err) {
  if (err instanceof TruvaError) {
    console.log(err.currentTier);  // "Bronze"
    console.log(err.requiredTier); // "Gold"
  }
}
```

## AI Agent Utilities

```typescript
import { AgentWallet, wrapWithTrustGate } from "@truva/sdk";

// Headless keypair wallet for autonomous agents
const agent = AgentWallet.generate();
const client = agent.createClient(connection, { apiUrl: "http://localhost:3001" });

// Middleware — gate any function behind a trust check
const gatedTransfer = wrapWithTrustGate(client, agent.publicKey, "Silver", transfer);
await gatedTransfer(recipient, amountLamports);
```

## Program ID (Devnet)

```
BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5
```

Override via environment variable: `TRUVA_PROGRAM_ID=<your-id>`

## Backward Compatibility

`Truva` is an alias for `TruvaClient` and will be removed in v1.0.

```ts
// Deprecated — use TruvaClient
import { Truva } from "@truva/sdk";
```

## License

MIT — [Truva Protocol](https://truva-x.tech)
