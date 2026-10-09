# Changelog

All notable changes to `@truva-protocol/sdk` will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

Requires the TrustGate program version with protocol config, merchant policies and agent vaults.

### Added
- Token-2022 vaults: optional `tokenProgram` argument on `createVaultIx`, `vaultPayIx`, `vaultWithdrawIx`, `closeVaultIx` and `deriveAssociatedTokenAddress`; `TOKEN_2022_PROGRAM_ID`; `getVault`, `fetchWithVault` and the paywall handle both token programs
- Score provenance: `attestScoreIx`, `TruvaClient.getScoreRecord`, `parseScoreRecordAccount`, `deriveScoreRecordPDA`
- Scorer committee: `setCommitteeIx`, `committeeVoteIx`, `committeeSetFrozenIx`, `TruvaClient.getCommittee`, `parseCommitteeAccount`, `deriveCommitteePDA`, `deriveProposalPDA`, `MAX_COMMITTEE`
- Program error names 6016–6020
- Agent vault instruction builders: `createVaultIx`, `updateVaultPolicyIx`, `setVaultPausedIx`, `vaultPayIx`, `vaultWithdrawIx`, `closeVaultIx`
- `setMerchantPolicyIx` / `closeMerchantPolicyIx` — a recipient's minimum tier
- `verifyTrustIx` — on-chain trust check to compose into a transaction
- `initializePassportIx` — permissionless passport creation
- `TruvaClient.getVault()`, `getMerchantMinTier()`, `getConfig()`
- x402-style paywall: `truvaPaywall` (seller middleware), `fetchWithVault` (agent client), `settleVaultPayment`, `createVaultPayment`, `buildPaymentRequirements`, `PaymentRejectedError`
- PDA helpers: `deriveConfigPDA`, `deriveMerchantPolicyPDA`, `deriveVaultPDA`, `deriveAssociatedTokenAddress`
- Account parsers: `parseVaultAccount`, `parseMerchantPolicyAccount`, `parseConfigAccount`
- `PROGRAM_ERRORS` — program error codes to names
- x402 wire compatibility for the paywall (scheme stays `truva-vault`):
  - 402 body is a complete x402 v1 response: `resource` is an absolute URL, `description` and `mimeType` are always present
  - 402 also carries an x402 v2 `PAYMENT-REQUIRED` header (CAIP-2 network, `amount`, `resource` object) when the network has a CAIP-2 id
  - Payment is accepted from `X-PAYMENT` (v1) or `PAYMENT-SIGNATURE` (v2); the receipt is returned in `X-PAYMENT-RESPONSE` or `PAYMENT-RESPONSE` to match
  - Receipt has the x402 `SettlementResponse` fields (`success`, `transaction`, `network`, `payer`); `signature` and `amount` are kept
  - A refused payment also returns a receipt header with `success: false` and `errorReason`
  - `fetchWithVault` skips other schemes and malformed entries in `accepts`, and reads the v2 header when the body has no `truva-vault` requirement
  - `createVaultPayment` takes `x402Version: 2` to produce a `PAYMENT-SIGNATURE` value
  - New exports: `X402_HEADERS`, `SOLANA_CAIP2_NETWORKS`, `toCaip2Network`, `fromCaip2Network`, `buildPaymentRequired`, `buildPaymentRequiredV2`, `toPaymentRequirementsV2`, `selectVaultRequirements`, `encodePaymentPayload`, `decodePaymentPayload`, `decodeSettlementResponse`, `encodeX402Header`, `decodeX402Header`
  - `PaywallOptions.resource`, `PaywallOptions.mimeType`
- `FetchWithVaultOptions.programId`
- Paywall can also accept the standard x402 `exact` scheme on Solana, settled through a facilitator (opt-in, `PaywallOptions.exact`):
  - The 402 lists two requirements for the same token, amount and seller: `truva-vault`, then `exact` with `extra.feePayer` (v1 body and v2 `PAYMENT-REQUIRED` header)
  - `extra.feePayer` comes from `exact.feePayer`, or from the facilitator's `GET /supported` (cached)
  - An `exact` payment is forwarded to the facilitator's `POST /verify` and `POST /settle`; a rejection is a 402 with the facilitator's reason, success sets `X-PAYMENT-RESPONSE` / `PAYMENT-RESPONSE`
  - `exact` payments bypass all Truva trust checks. `truvaPaywall` throws if `exact` is combined with a `minTier` above Bronze, unless `exact.allowUngated` is set
  - `SettledPayment.scheme` (`req.truvaPayment.scheme`): `"truva-vault"` or `"exact"`
  - New exports: `EXACT_SCHEME`, `createFacilitatorClient`, `findExactFeePayer`, `buildExactRequirements`, `toExactRequirementsV2`, `FacilitatorError`, and their types
  - Tested against a mocked facilitator only; not yet run against a live facilitator or a stock x402 client

### Changed
- `getAgentScore()` also returns `authority` and `trusted`. `trusted` is false when the passport was not scored by the protocol scorer
- `requireTrustTier()` rejects untrusted passports with code `UNTRUSTED_AUTHORITY`
- `fetchWithVault` refuses a 402 that names a program other than `programId` (default: the TrustGate program) before signing. Pass `programId` when paying a custom deployment
- `PaymentRequirements.description` and `mimeType` are always strings (empty when not set)
- Malformed payment headers are rejected with reason `malformed payment header` (was `malformed X-PAYMENT header`)
- Docs and code comments use the published package name `@truva-protocol/sdk`

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
