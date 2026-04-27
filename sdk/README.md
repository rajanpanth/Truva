# truva-sdk

TypeScript SDK for the **Truva Protocol** — trust-gated AI agent payments on Solana.

## Install

```bash
npm install @truva-protocol/sdk
```

## Quick Start

```typescript
import { TruvaSDK } from "truva-sdk";
import { PublicKey } from "@solana/web3.js";

const truva = new TruvaSDK({
  rpcUrl: "https://api.devnet.solana.com",
  apiUrl: "http://localhost:4000",
});

// Read trust score directly from on-chain PDA
const score = await truva.getAgentScore(new PublicKey("Agent..."));
console.log(score.tier);  // "Gold"
console.log(score.score); // 87

// Gate a payment — throws TruvaError if tier is insufficient
await truva.requireTrustTier("Gold", agentPubkey);
```

## API

### `getAgentScore(agentPubkey)` → `{ score, tier, txCount, successRate, frozen }`
Read trust data directly from the on-chain Passport PDA.

### `requireTrustTier(tier, agentPubkey)` → `void`
Throws `TruvaError` if the agent doesn't meet the required tier.

### `register(agentPubkey)` → `string`
Register a new agent via the REST API.

### `getAgentProfile(agentPubkey)` → `AgentProfile`
Full profile from the reputation engine.

### `getScoreHistory(agentPubkey)` → `ScoreHistory[]`
Historical score snapshots.

### `isEligible(agentPubkey, tier, amount)` → `boolean`
Check if agent qualifies for a payment.

## Trust Tiers

| Tier | Rank | Max Payment |
|------|------|-------------|
| Bronze | 0 | 5 SOL |
| Silver | 1 | 100 SOL |
| Gold | 2 | Unlimited |
| Platinum | 3 | Unlimited |

## License

MIT — [Truva Protocol](https://truva-x.tech)
