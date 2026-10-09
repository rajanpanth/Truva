# Security Statement — Truva Protocol

## Overview

Truva Protocol is a spending-policy and trust-enforcement layer for AI agent payments on Solana. The smart contract (`TrustGate`) holds owner funds in agent vaults and processes SOL and SPL token transfers gated by owner limits, programmable trust tiers and recipient policies. Because the program directly handles value transfer and access control, security is foundational — not optional.

**Program ID:** `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5`  
**Framework:** Anchor v0.30+ (Rust)  
**Network:** Solana Devnet (mainnet deployment planned post-audit)  

---

## Security Architecture

### 1. Trust Root: Protocol Config

A singleton `ProtocolConfig` PDA (`["config"]`) stores the `admin` and the `scorer`.

- **`initialize_config`** can only be signed by the program's upgrade authority, verified against the program's `ProgramData` account. It cannot be front-run after deployment.
- **`update_config`** (admin only) rotates the scorer or hands over admin.
- A passport is accepted by the gate only when `passport.authority == config.scorer` (`AgentPassport::assert_trusted`). Rotating the scorer therefore invalidates every score issued by the old key until the new scorer re-issues it with `adopt_passport`.

### 2. Passports Cannot Be Self-Scored

- **`initialize_passport`** is permissionless (anyone pays the rent), but the passport's authority is always set to `config.scorer`, never the payer. A new passport starts at score 0, Bronze.
- **`update_trust_tier`**, **`freeze_passport` / `unfreeze_passport`**, **`close_passport`** and **`migrate_passport`** require the passport's authority via `has_one = authority @ TruvaError::Unauthorized`.
- **`adopt_passport`** (current scorer only) takes over a passport whose authority is a different key, with an explicit score and tier, so a tier assigned by any other key never carries over.

### 3. PDA Derivation & Account Integrity

| Account | Seeds |
|---------|-------|
| `ProtocolConfig` | `["config"]` |
| `AgentPassport` | `["passport", agent]` |
| `MerchantPolicy` | `["merchant", merchant]` |
| `AgentVault` | `["vault", owner, agent, mint]` |

- Canonical bumps are stored at initialization and validated on every later access.
- Account sizes are explicit constants (`LEN`) with per-field documentation.
- The vault's token account is the associated token account of the vault PDA, validated with `associated_token::mint` / `associated_token::authority` on every instruction that touches it.

### 4. Agent Vaults (program-owned funds)

Vault tokens are owned by the vault PDA. They can leave in exactly three ways:

- **`vault_pay`** (agent signer). Checks, all before the transfer CPI:
  1. vault is not paused by its owner
  2. passport is trusted (authority is the scorer), not frozen, and at or above the recipient's merchant policy tier
  3. recipient wallet is on the allowlist, if the owner set one
  4. amount is non-zero and within the per-payment limit
  5. the 24-hour window total stays within the daily limit
- **`vault_withdraw`** (owner signer) to a token account owned by the owner.
- **`close_vault`** (owner signer), which returns the remaining balance to the owner and closes both accounts.

The agent key cannot change limits, unpause, withdraw or close: those instructions require `has_one = owner`, and the vault address itself is derived from the owner's key.

### 5. Merchant Policy (recipient-controlled tier)

A recipient sets the minimum tier it accepts with `set_merchant_policy`. Payment instructions take the policy PDA as a required account whose address is derived from the recipient (`seeds = ["merchant", recipient]`), so the paying agent can neither omit it nor substitute another recipient's policy. An uninitialized policy account means Bronze.

### 6. Direct Payment Gating

`process_payment_sol` and `process_payment_spl` transfer from the agent's own wallet after the same trust check (`assert_trusted` with the higher of the caller's `required_tier` and the merchant policy), plus tier-based amount caps (Bronze: 5 SOL, Silver: 100 SOL, Gold: unlimited). All checks execute before the transfer CPI.

### 7. Arithmetic Safety & Input Validation

- Counters and spend totals use `checked_add` with explicit error handling.
- Trust scores are bounded: `require!(new_score <= 100, TruvaError::InvalidTrustScore)`.
- Vault policies are validated: per-payment limit cannot exceed the daily limit; the allowlist holds at most 8 recipients.
- Token transfers use `transfer_checked` with the mint's decimals in vault instructions; source, destination and mint are constrained to match.

### 8. Event Emission & Auditability

Every state-changing instruction emits a structured Anchor event (`ConfigUpdated`, `PassportInitialized`, `PassportAdopted`, `TrustTierUpdated`, `PaymentProcessed`, `PassportFrozen`, `PassportUnfrozen`, `PassportClosed`, `MerchantPolicySet`, `VaultCreated`, `VaultPolicyUpdated`, `VaultPayment`, `VaultWithdrawal`), enabling:

- Off-chain indexing via Helius webhooks
- Post-incident forensic analysis
- Real-time monitoring of suspicious activity

### 9. Test Coverage

51 tests run against a local validator (`tests/trustgate.test.ts`, `tests/x402.test.ts`). They include negative cases for each control: config creation by a non-upgrade-authority, self-scoring, a rotated scorer, a substituted merchant policy account, every vault limit, pause, freeze, a different agent spending from a vault, and the agent attempting to change policy or withdraw.

---

## Known Limitations

These are deliberate scope limits or open issues, listed so integrators and auditors do not have to discover them:

1. **Direct payments are advisory.** An agent that holds its own funds can transfer them without calling TrustGate. Only vault funds are enforced.
2. **Direct SPL caps ignore decimals.** `process_payment_spl` applies the same raw-unit caps as the SOL path regardless of the mint. Vaults do not have this issue (the owner sets limits per mint).
3. **Classic SPL Token only.** Vaults do not support Token-2022 mints.
4. **Fixed 24-hour window.** The daily limit uses a fixed window that restarts on the first payment after it expires, so up to twice the daily limit can be spent across a window boundary.
5. **Single-key scorer.** The scorer is one key held by the backend. It is trusted to score honestly and to freeze correctly; compromise lets an attacker set any score or freeze any agent until the admin rotates it. A multisig or timelock is planned before mainnet.
6. **Rent on closure.** `close_passport` returns rent to the scorer, not to whoever paid for the passport.
7. **Daily-window rollover is untested.** The test suite cannot advance the validator clock.
8. **Not audited.** The program is deployed on devnet only.

---

## Off-Chain Security Considerations

### Backend Authority Key Management

The reputation engine's `chain-writer` service holds a backend authority keypair (`BACKEND_AUTHORITY_KEY`) that signs on-chain tier updates. This is the most sensitive credential in the system:

- Stored as an environment variable (not committed to source)
- Supports both base58 and JSON array formats for flexibility
- This key is the protocol `scorer` in the on-chain config. It can set scores and tiers and freeze or unfreeze any passport
- **Risk:** Compromise of this key would allow arbitrary trust score manipulation and freezing. The config `admin` (a separate key) can rotate it with `update_config`, which invalidates every score the old key issued
- It cannot move funds: vault tokens only move on the agent's signature within the owner's limits, or on the owner's signature

### Scoring Engine Integrity

The 6-signal scoring engine operates off-chain with on-chain writes only on tier transitions. This design:

- **Reduces on-chain cost** (avoids writing every score change)
- **Introduces trust assumption** — the backend authority is trusted to compute scores honestly
- **Inputs:** transaction volume, success rate, counterparty diversity and account age come from indexed on-chain transactions; Agent Registry reputation is read from the Solana Agent Registry (ERC-8004); validator attestations are submitted through the authenticated API
- **Risk monitor:** when `AUTO_FREEZE_ENABLED=true`, the engine freezes a passport whose recent activity matches a burst, counterparty-spray or failure-spike pattern. It is off by default because a false positive blocks a legitimate agent

### Database & Cache Layer

- PostgreSQL stores agent profiles, transaction history, score history, attestations and cached Agent Registry reputation
- Redis caches current scores for low-latency reads
- Both are infrastructure dependencies that require standard operational security (network isolation, access control, encrypted connections)

---

## Known Security Considerations for Audit

We specifically request auditor attention on the following areas:

### Critical Priority
1. **PDA derivation correctness** — Verify the seed schemes for config, passport, merchant policy and vault are collision-resistant and that bump validation is correct across all instructions.
2. **Payment CPI safety** — Verify that the SOL system program transfer and SPL token transfer CPIs cannot be manipulated (e.g., through account substitution or reordering).
3. **Authority validation completeness** — Confirm that every privileged instruction properly validates authority via `has_one`, that `initialize_config` can only be executed by the upgrade authority, and that no path lets a key other than the scorer produce a passport that passes `assert_trusted`.
4. **Vault fund safety** — Confirm tokens can only leave a vault through `vault_pay`, `vault_withdraw` and `close_vault`, that the PDA signer seeds cannot be reproduced for another vault, and that limit accounting cannot be bypassed (e.g. repeated instructions in one transaction, window reset, zero or dust amounts).
5. **Merchant policy handling** — `merchant_policy` is an `UncheckedAccount` with a seeds constraint, deserialized manually in `MerchantPolicy::required_tier`. Verify the owner and emptiness checks are sufficient.
6. **Tier comparison logic** — The `PartialOrd`/`Ord` derive on `TrustTier` enum determines payment gating. Verify the derived ordering matches intended semantics (Bronze < Silver < Gold).

### High Priority
7. **Account closure and rent reclamation** — Verify that `close_passport` properly handles all edge cases (e.g., closing a frozen passport, re-initialization after closure).
8. **SPL token account constraints** — Verify the mint and owner constraints on source and destination token accounts in `process_payment_spl` and the vault instructions.
9. **Migration instruction safety** — `migrate_passport` uses `realloc` with `zero = false`. Verify that uninitialized memory cannot leak sensitive data.

### Medium Priority
10. **Arithmetic overflow in tier limits** — `Gold` tier uses `u64::MAX` as the limit. Verify edge cases around maximum transfer amounts.
11. **Timestamp dependency** — The vault daily window relies on `Clock::get()?.unix_timestamp`. Verify that clock behaviour cannot be used to exceed limits beyond the documented window-boundary case.
12. **Event emission ordering** — Verify that events are emitted after state changes are finalized, ensuring event consumers see consistent state.

---

## Why a Professional Security Audit is Critical

Truva Protocol occupies a unique position in the Solana ecosystem: it is **infrastructure that other protocols depend on** to make trust decisions about AI agents. A vulnerability in TrustGate doesn't just affect Truva — it affects every protocol that integrates our trust gates.

Specific risks that a professional audit would mitigate:

- **False trust elevation** — If an attacker can artificially inflate their trust score or tier, they gain access to higher payment limits across all integrating protocols.
- **Payment bypass** — If the vault checks or the trust gate can be circumvented, an agent could spend beyond its owner's limits or untrusted agents could process unauthorized transfers.
- **Authority key compromise impact** — Understanding the blast radius of a compromised authority key and recommending mitigations (e.g., multisig, timelock).
- **Integration safety** — As other Solana programs integrate TrustGate via CPI, ensuring the CPI interface cannot be abused is critical for ecosystem safety.

We are committed to security as an ongoing process. This audit would be the first step in establishing a continuous security program as Truva moves toward mainnet deployment.

---

## Test Coverage

The suite has **51 passing tests** (42 program tests in `tests/trustgate.test.ts`, 9 end-to-end paywall tests in `tests/x402.test.ts`):

| Category | Tests | Coverage |
|----------|-------|----------|
| Protocol Config | 3 | Upgrade-authority check, creation, non-admin update rejected |
| Passport Initialization | 3 | Default state, scorer is authority, self-scoring rejected |
| Trust Tier Updates | 4 | Score and tier set independently, bounds, non-authority rejected |
| Freeze/Unfreeze | 2 | State toggling |
| verify_trust | 4 | Return data, insufficient tier, frozen, scorer rotation and adoption |
| SOL Payment Gating | 5 | Frozen block, tier check, amount limits, happy path |
| Merchant Policy | 3 | Recipient-set tier, substituted policy account rejected, update and close |
| SPL Payment Gating | 1 | Real token transfer with trust gate |
| Agent Vault | 16 | Limits, allowlist, pause, freeze, merchant policy, wrong agent, agent cannot withdraw or change policy, owner withdraw and close |
| Account Closure | 1 | Rent reclamation |
| x402 Paywall | 9 | 402 challenge, paid request, buyer price cap, underpayment, wrong recipient, tier, daily limit, pause |

The SDK has 63 unit tests and the reputation engine 33.

---

## Contact

For security-related inquiries, please contact the Truva Protocol team via our GitHub repository or hackathon submission channels.
