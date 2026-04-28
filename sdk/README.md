# @truva/sdk

TypeScript SDK for the **Truva Protocol** — trust-gated AI agent payments on Solana.

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
