# Changelog

All notable changes to `@truva-protocol/sdk` will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] — 2026-04-27

### Added
- `TruvaSDK` — core trust-gate client (browser-safe, no Node deps)
- `AgentWallet` — headless keypair wallet for autonomous agents
  - `AgentWallet.fromEnv(envVar)` — load from JSON-array env variable
  - `AgentWallet.fromSecretKey(bytes)` — load from raw bytes
  - `AgentWallet.generate()` — ephemeral keypair
- `wrapWithTrustGate` — middleware that gates any async function
- `derivePassportPDA` — on-chain Passport PDA derivation
- `TruvaError` / `InsufficientTierError` / `AgentFrozenError` — typed errors with `code` field
- `getAgentScore(agentPubkey)` — read trust score directly from Passport PDA
- `requireTrustTier(tier, agentPubkey)` — throws `TruvaError` if tier insufficient
- `register(agentPubkey)` — register agent via reputation engine API
- `getAgentProfile(agentPubkey)` — full profile from REST API
- `getScoreHistory(agentPubkey)` — historical score snapshots
- `isEligible(agentPubkey, tier, amount)` — combined tier + amount check
- `truvaPlugin` (`truva-sdk/eliza`) — elizaOS plugin
  - `TRUVA_VERIFY_TRUST` action
  - `TRUVA_TRUST_STATUS` provider
- `createTruvaTool` (`truva-sdk/langchain`) — LangChain StructuredTool-compatible tool
- CJS + ESM + DTS builds via tsup
- Sub-path exports: `truva-sdk`, `truva-sdk/eliza`, `truva-sdk/langchain`
- Automatic 3-retry with exponential backoff on API calls
- Anchor IDL-based fetch with manual byte-parsing fallback
- Devnet program ID: `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5`
- 57 tests (vitest) — all passing
