# Security Statement — Truva Protocol

## Overview

Truva Protocol is an on-chain trust and reputation layer for AI agents on Solana. The smart contract (`TrustGate`) processes real SOL and SPL token transfers gated by programmable trust tiers. Because the program directly handles value transfer and access control, security is foundational — not optional.

**Program ID:** `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5`  
**Framework:** Anchor v0.30+ (Rust)  
**Network:** Solana Devnet (mainnet deployment planned post-audit)  

---

## Security Architecture

### 1. On-Chain Access Control

All privileged operations enforce **authority-gated access** via Anchor's `has_one` constraint:

- **`update_trust_tier`** — Only the passport's designated authority can modify trust scores. Validated at the account constraint level (`has_one = authority @ TruvaError::Unauthorized`), ensuring the check cannot be bypassed by instruction logic bugs.
- **`freeze_passport` / `unfreeze_passport`** — Authority-only. Freezing immediately blocks all payment processing for the target agent.
- **`close_passport`** — Authority-only. Rent reclamation flows exclusively to the authority wallet.
- **`migrate_passport`** — Authority-only. Idempotent migration with `created_at == 0` guard prevents repeated execution.

### 2. PDA Derivation & Account Integrity

Agent Passports are Program Derived Accounts (PDAs) seeded with `["passport", agent_pubkey]`:

- **Deterministic addressing** — Each agent can only have one passport. The PDA seed scheme prevents duplicate passports for the same agent.
- **Bump seed storage** — The canonical bump is stored on-chain at initialization and validated on every subsequent access via `bump = passport.bump`.
- **Account size** — Explicitly calculated (`AgentPassport::LEN = 100 bytes`) with per-field documentation to prevent buffer overflows or under-allocation.

### 3. Payment Gating Logic (TrustGate)

The core value-transfer instructions (`process_payment_sol`, `process_payment_spl`) implement a three-layer gate:

1. **Frozen check** — `require!(!passport.frozen, TruvaError::PassportFrozen)` — Frozen agents cannot transact under any circumstances.
2. **Tier check** — `require!(passport.trust_tier >= required_tier, TruvaError::InsufficientTrustTier)` — Agent's earned tier must meet or exceed the caller-specified minimum.
3. **Amount limit check** — Tier-based transfer caps (Bronze: 5 SOL, Silver: 100 SOL, Gold: unlimited) prevent low-trust agents from processing high-value transfers.

All three checks execute **before** any CPI transfer call, following the check-effects-interactions pattern.

### 4. Arithmetic Safety

All counter increments (`tx_count`, `success_count`) use Rust's `checked_add()` with explicit error handling:

```rust
passport.tx_count = passport.tx_count
    .checked_add(1)
    .ok_or(TruvaError::ArithmeticOverflow)?;
```

This prevents silent integer overflow that could corrupt passport state.

### 5. Input Validation

- Trust scores are bounded: `require!(new_score <= 100, TruvaError::InvalidTrustScore)`
- Trust tier derivation uses exhaustive match with a safe fallback (`_ => TrustTier::Bronze`)
- SPL token account ownership is validated: `constraint = agent_token.owner == agent.key()`

### 6. Event Emission & Auditability

Every state-changing instruction emits a structured Anchor event (`PassportInitialized`, `TrustTierUpdated`, `PaymentProcessed`, `PassportFrozen`, `PassportUnfrozen`, `PassportClosed`), enabling:

- Off-chain indexing via Helius webhooks
- Post-incident forensic analysis
- Real-time monitoring of suspicious activity

---

## Off-Chain Security Considerations

### Backend Authority Key Management

The reputation engine's `chain-writer` service holds a backend authority keypair (`BACKEND_AUTHORITY_KEY`) that signs on-chain tier updates. This is the most sensitive credential in the system:

- Stored as an environment variable (not committed to source)
- Supports both base58 and JSON array formats for flexibility
- **Risk:** Compromise of this key would allow arbitrary trust score manipulation for any passport created by this authority

### Scoring Engine Integrity

The 6-signal scoring engine operates off-chain with on-chain writes only on tier transitions. This design:

- **Reduces on-chain cost** (avoids writing every score change)
- **Introduces trust assumption** — the backend authority is trusted to compute scores honestly
- **Mitigant:** All scoring inputs (transaction volume, success rate, counterparty diversity, account age, ZK proofs, attestations) are derived from on-chain or verifiable data

### Database & Cache Layer

- PostgreSQL stores agent profiles, transaction history, score history, ZK proofs, and attestations
- Redis caches current scores for low-latency reads
- Both are infrastructure dependencies that require standard operational security (network isolation, access control, encrypted connections)

---

## Known Security Considerations for Audit

We specifically request auditor attention on the following areas:

### Critical Priority
1. **PDA derivation correctness** — Verify that the `["passport", agent_pubkey]` seed scheme is collision-resistant and that bump validation is correct across all instructions.
2. **Payment CPI safety** — Verify that the SOL system program transfer and SPL token transfer CPIs cannot be manipulated (e.g., through account substitution or reordering).
3. **Authority validation completeness** — Confirm that every privileged instruction properly validates authority via `has_one` and that no instruction allows unauthorized state changes.
4. **Tier comparison logic** — The `PartialOrd`/`Ord` derive on `TrustTier` enum determines payment gating. Verify the derived ordering matches intended semantics (Bronze < Silver < Gold).

### High Priority
5. **Account closure and rent reclamation** — Verify that `close_passport` properly handles all edge cases (e.g., closing a frozen passport, re-initialization after closure).
6. **SPL token account constraints** — The `recipient_token` account in `process_payment_spl` is mutable but not fully constrained. Verify this cannot be exploited.
7. **Migration instruction safety** — `migrate_passport` uses `realloc` with `zero = false`. Verify that uninitialized memory cannot leak sensitive data.

### Medium Priority
8. **Arithmetic overflow in tier limits** — `Gold` tier uses `u64::MAX` as the limit. Verify edge cases around maximum transfer amounts.
9. **Timestamp dependency** — The program uses `Clock::get()?.unix_timestamp`. Verify that clock manipulation cannot affect security-critical logic.
10. **Event emission ordering** — Verify that events are emitted after state changes are finalized, ensuring event consumers see consistent state.

---

## Why a Professional Security Audit is Critical

Truva Protocol occupies a unique position in the Solana ecosystem: it is **infrastructure that other protocols depend on** to make trust decisions about AI agents. A vulnerability in TrustGate doesn't just affect Truva — it affects every protocol that integrates our trust gates.

Specific risks that a professional audit would mitigate:

- **False trust elevation** — If an attacker can artificially inflate their trust score or tier, they gain access to higher payment limits across all integrating protocols.
- **Payment bypass** — If the three-layer gate can be circumvented, untrusted agents could process unauthorized transfers.
- **Authority key compromise impact** — Understanding the blast radius of a compromised authority key and recommending mitigations (e.g., multisig, timelock).
- **Integration safety** — As other Solana programs integrate TrustGate via CPI, ensuring the CPI interface cannot be abused is critical for ecosystem safety.

We are committed to security as an ongoing process. This audit would be the first step in establishing a continuous security program as Truva moves toward mainnet deployment.

---

## Test Coverage

The program has **13 passing test cases** covering:

| Category | Tests | Coverage |
|----------|-------|----------|
| Passport Initialization | 2 | Default state, tier assignment |
| Authority Validation | 1 | Reject non-authority updates |
| Trust Tier Updates | 1 | Score-to-tier mapping |
| Freeze/Unfreeze | 2 | State toggling |
| SOL Payment Gating | 4 | Frozen block, tier check, amount limits, happy path |
| SPL Payment Gating | 1 | Token transfer with trust gate |
| Account Closure | 1 | Rent reclamation |

---

## Contact

For security-related inquiries, please contact the Truva Protocol team via our GitHub repository or hackathon submission channels.
