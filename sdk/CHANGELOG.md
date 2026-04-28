# Changelog

All notable changes to `@truva-protocol/sdk` will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-04-28

### Added
- `Truva` class with on-chain + REST API integration
- `getAgentScore(agentPubkey)` — read trust score directly from Passport PDA
- `requireTrustTier(tier, agentPubkey)` — throws `TruvaError` if tier insufficient
- `register(agentPubkey)` — register agent via reputation engine API
- `getAgentProfile(agentPubkey)` — full profile from REST API
- `getScoreHistory(agentPubkey)` — historical score snapshots
- `isEligible(agentPubkey, tier, amount)` — combined tier + amount check
- `derivePassportPDA(agentPubkey)` — deterministic PDA derivation
- `TruvaError` class with `currentTier` and `requiredTier` fields
- Automatic 3-retry with exponential backoff on API calls
- Anchor IDL-based fetch with manual byte-parsing fallback
- Devnet program ID: `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5`
