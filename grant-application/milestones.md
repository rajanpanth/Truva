# Truva — Grant Milestones
**Superteam Agentic Engineering Grant | 200 USDG**
**Applicant:** rajan_panth | Deadline: May 14, 2026

---

## Overview

Truva is a trust and reputation layer for AI agents on Solana. The grant milestones represent the path from the current working prototype (live at [truva-x.tech](https://www.truva-x.tech/)) to a production-grade, mainnet-deployed protocol that any Solana project can integrate.

---

## Milestone 1 — Mainnet Deployment & Program Verification
**Target:** Week 1–2 (by April 28, 2026)

### Deliverables
- [ ] Deploy `trustgate` Anchor program to Solana mainnet-beta
- [ ] Verify program on-chain (anchor verify or source verification)
- [ ] Update all program IDs: `Anchor.toml`, `lib.rs`, `sdk/src/index.ts`, `app/lib/solana.ts`
- [ ] Smoke-test all 7 core instructions on mainnet
- [ ] Update live site to point to mainnet program

### Proof of Completion
- Mainnet program address published on README and live site
- Solana Explorer link to deployed program
- At least 3 test transactions visible on-chain (initialize, update_trust, process_payment)

---

## Milestone 2 — Helius Webhook Integration (Real-Time Reputation)
**Target:** Week 2–3 (by May 5, 2026)

### Deliverables
- [ ] Set up Helius webhook on mainnet program address
- [ ] Build webhook handler API route: `POST /api/webhooks/helius`
- [ ] Auto-update agent reputation scores from on-chain events (no manual seeding)
- [ ] Replace `mock-data.ts` with live Supabase writes from webhook
- [ ] Real-time dashboard reflects actual on-chain agent activity

### Proof of Completion
- Webhook handler code pushed to GitHub
- Live demo: perform on-chain transaction → watch dashboard update in <5s
- Supabase table screenshot showing live agent reputation data

---

## Milestone 3 — SDK Publication & Protocol Integration Docs
**Target:** Week 3 (by May 9, 2026)

### Deliverables
- [ ] Publish `@truva/sdk` to npm (public package)
- [ ] SDK exports: `requireTrustTier`, `getAgentPassport`, `derivePassportPDA`, `computeTrustScore`
- [ ] Write integration guide: "Add TrustGate to your Solana protocol in 5 minutes"
- [ ] Add TypeScript types and JSDoc to all SDK exports
- [ ] Integration example repo (or CodeSandbox) demonstrating SDK usage

### Proof of Completion
- npm package URL (npmjs.com/package/@truva/sdk)
- Integration guide published at truva-x.tech/docs
- Example repo showing `requireTrustTier()` gating a sample payment

---

## Milestone 4 — ZK Proof Task-Completion Signal
**Target:** Week 4 (by May 14, 2026)

### Deliverables
- [ ] Design ZK task-completion proof schema (task hash + success boolean + agent pubkey)
- [ ] Implement proof generation stub using RISC Zero or Groth16 (or Solana's poseidon hash)
- [ ] On-chain instruction `submit_task_proof` that verifies proof + increments agent trust score
- [ ] Frontend: agent profile shows "ZK-verified tasks" badge + count
- [ ] Architecture document explaining proof flow end-to-end

### Proof of Completion
- `submit_task_proof` instruction in Anchor program (on devnet minimum)
- At least 2 end-to-end ZK proofs submitted and verified on-chain
- Architecture diagram published

---

## Milestone 5 — Validator Attestation System
**Target:** Week 4–5 (stretch goal, by May 14, 2026)

### Deliverables
- [ ] Define attestation schema: validator pubkey + agent pubkey + attestation score (1–10) + timestamp + signature
- [ ] On-chain instruction `submit_attestation` requiring validator to co-sign
- [ ] Attestation weight integrated into reputation score formula
- [ ] Validator registry: curated list of trusted validators (initial set: 3 test validators)
- [ ] Dashboard: attestation history visible on agent profile

### Proof of Completion
- `submit_attestation` instruction deployed on devnet
- At least 1 agent with visible attestation history on live dashboard
- Updated scorer showing attestation signal contribution

---

## Success Metrics (End of Grant)

| Metric | Target |
|--------|--------|
| Mainnet program deployed | ✅ Yes |
| Live agents with real reputation data | ≥10 |
| Helius webhook latency (tx → score update) | <5 seconds |
| SDK npm weekly downloads | ≥50 in first month |
| On-chain test transactions | ≥100 |
| ZK proofs submitted on-chain | ≥2 |

---

## Current State (Pre-Grant Baseline)

Already shipped as proof of execution capability:

| Component | Status |
|-----------|--------|
| Anchor program (7 instructions) | ✅ Built, tested |
| Enforcement engine (TypeScript) | ✅ Live |
| Next.js dashboard | ✅ Live at truva-x.tech |
| Supabase backend | ✅ Live with real-time subscriptions |
| TypeScript SDK | ✅ Built, not yet published |
| SPL token payment support | ✅ Implemented |
| Rate-limited API with auth | ✅ Implemented |
| Anchor test suite (7 tests) | ✅ Passing |
| Helius webhook | ⏳ Milestone 2 |
| ZK proof layer | ⏳ Milestone 4 |
| Validator attestations | ⏳ Milestone 5 |
| Mainnet deployment | ⏳ Milestone 1 |

---

*Truva — Trust Infrastructure for the Agentic Economy*
*Live: [truva-x.tech](https://www.truva-x.tech/) | X: [@TruvaAgent](https://x.com/TruvaAgent)*
