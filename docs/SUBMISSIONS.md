# Crypto World's Fair — Submission Kit

Drafts for the main Colosseum submission and the four Superteam Earn sidetracks.
Everything marked **[FILL IN]** needs a fact only the team has. Deadlines: Colosseum
closes **12 Oct 2026, 11:59 PM PDT**; sidetracks close 13 Oct, 06:59 UTC.

Every sidetrack below also requires the main Colosseum submission.

---

## 1. Main Colosseum submission

**Project name:** Truva

**Category:** AI (fallback: Infrastructure, then Payments)

**Brief description (max 500 characters — this is 430):**

> Truva lets AI agents spend without holding the money. An owner funds an on-chain vault and sets a per-payment limit, a daily limit and allowed recipients. The agent pays x402-style paywalls from the vault, and the Solana program enforces every limit, the agent's trust tier and the seller's minimum tier at settlement. Scores draw on the Solana Agent Registry. Owners can pause a vault, and compromised agents are frozen on-chain.

**What is new since the Frontier hackathon (disclose this):**

Truva was first submitted to Colosseum Frontier (May 2026) as an agent trust-score registry
with an optional payment gate. For Crypto World's Fair it was rebuilt around enforcement:

- Agent vaults: program-owned funds with owner-set limits (`create_vault`, `vault_pay`, pause, withdraw, close)
- Protocol config and scorer: scores can no longer be self-assigned
- Merchant policy: the recipient, not the paying agent, sets the required tier
- `verify_trust`: a CPI entry point for other programs
- x402-style paywall middleware and agent client in the SDK, with an end-to-end test
- Solana Agent Registry (ERC-8004) feedback as a scoring signal, replacing the unverified ZK-proof signal
- Risk monitor that can freeze a passport automatically
- Tests: 13 → 51 program and end-to-end tests

**Demo script for the video (about 2 minutes):** run `npm run demo:x402` and narrate the output —
402 challenge → paid request with transaction signature → blocked by seller's Gold requirement →
blocked at the daily limit → blocked while paused → blocked after the passport is frozen.

**Links:** repo https://github.com/rajanpanth/Truva · live app **[FILL IN]** · video **[FILL IN]** ·
program `BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5` (devnet)

---

## 2. Superteam Nepal Track ($5,000)

**Eligibility checklist**
- [ ] Every team member registered on Colosseum with country = Nepal
- [ ] Project submitted on the Colosseum portal
- [ ] Same project submitted on Superteam Earn

**Pitch, written to the three judging criteria:**

*Ecosystem impact.* Agent payments on Solana are growing through x402, but an agent with a
funded wallet is one prompt injection away from draining it. Truva is infrastructure other
builders use: sellers add one middleware call, owners get on-chain spending limits, and any
program can check an agent with one CPI. It builds on the Solana Agent Registry instead of
competing with it.

*Product-market fit.* The user is anyone who lets an agent pay for things: a developer running
a research agent against paid APIs, or a team running trading or procurement agents. The
problem is concrete (how much can this agent lose?) and the answer is a number the owner sets.
**[FILL IN: any real users, design partners or conversations with x402 sellers]**

*Growth potential.* Every x402 seller and every agent framework is a distribution channel:
the SDK already ships Eliza, LangChain and MCP integrations. **[FILL IN: go-to-market plan]**

---

## 3. RPC Fast Infrastructure Sidetrack (about $500 of RPC plan per selected team)

**Requirements checklist** (all are manual steps)
- [ ] Complete the RPC Fast application form (Focus plan access for up to two months)
- [ ] Follow @rpcfast on X
- [ ] Join the RPC Fast Telegram and Discord
- [ ] Publish 2–3 posts per month about RPC Fast for the next two months
- [ ] Submit on Superteam Earn

**How Truva uses RPC Fast (for the form):**

RPC Fast offers mainnet endpoints, so Truva uses it where it reads mainnet:

- **Agent Registry reads.** The reputation engine looks up each agent's identity and feedback
  on the Solana Agent Registry (mainnet) through `AGENT_REGISTRY_RPC_URL`.
- **Mainnet deployment.** After audit, the TrustGate program, the paywall's settlement calls
  (`sendRawTransaction`, confirmation) and SDK passport and vault reads will run on RPC Fast.

**To make this claim true before submitting:** set `AGENT_REGISTRY_RPC_URL` to your RPC Fast
mainnet endpoint in the deployed backend and confirm a registry lookup succeeds.
The key that was previously committed in the repo must be rotated first.

---

## 4. CertiK Security Audit Credits (10 × $10,000 in audit credits)

**Submission contents**

- **Colosseum link:** **[FILL IN]** · **Repo:** https://github.com/rajanpanth/Truva (public)
- **Description, problem, users:** use the brief description and Nepal pitch above.
- **Programs to audit:** one Anchor program, `programs/trustgate` — about 1,720 lines of Rust
  excluding comments and blanks (2,290 total), 24 instructions, 7 account types. Anchor 0.30.1.
- **Value at risk:** the program custodies owner funds in agent vaults (SPL tokens held by
  program-derived accounts) and gates SOL and SPL transfers.
- **Maturity:** deployed on devnet; 70 passing program and end-to-end tests; threat model,
  known limitations and a prioritized list of areas for auditor attention in `SECURITY.md`.
- **Target mainnet launch:** **[FILL IN]**
- **6–12 month roadmap:** **[FILL IN — suggested milestones: audit and fixes; mainnet launch
  with USDC vaults; scorer committee live with independent members; bounties for
  misbehaving agents (operator bond, on-chain reports reviewed by the committee, reporter
  paid from the bond; see the Roadmap section of the README); `exact`-scheme settlement
  verified against a live facilitator; first seller and agent-framework integrations]**
- **Team:** **[FILL IN: names, roles, X and GitHub handles, full-time or not]**
- **Fundraising status and plans:** **[FILL IN]**
- **Contact for scoping call:** **[FILL IN: Telegram or email]**

---

## 5. Adevar Labs Pre-Audit Credits (5 × $4,000 pre-audits) — closes 12 Oct

**Requirements checklist**
- [ ] Solana/Rust submission (yes: Anchor program)
- [ ] Submitted to Colosseum
- [ ] Follow @AdevarLabs on X
- [ ] Tweet about the application with the project link
- [ ] Answer the form questions on Superteam Earn

**Draft tweet:**

> We just applied for a pre-audit from @AdevarLabs for Truva, built for the @colosseum Crypto
> World's Fair. Truva holds agent funds in on-chain vaults with owner-set spending limits, so
> security review comes before mainnet. https://github.com/rajanpanth/Truva

**Notes for the form (judged on complexity, architectural clarity, readiness):**

- One program, four account types (config, passport, merchant policy, vault), clear separation
  of roles: admin, scorer, vault owner, agent, recipient.
- `SECURITY.md` documents the trust model, every control, known limitations and the specific
  areas we want reviewed (vault fund safety, merchant policy handling, authority validation).
- Tests include negative cases for each control.

---

## Devnet evidence (9 Oct 2026)

The upgraded program is live on devnet and `npm run demo:x402` ran against it end to end.

- Program: https://explorer.solana.com/address/BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5?cluster=devnet
- Agent vault: https://explorer.solana.com/address/yg2aFFvWRopFt3nGkjqet9nGNWXsq8xjDaYhAGw67TD?cluster=devnet
- Paid request 1 (`vault_pay`): https://explorer.solana.com/tx/CT3S1UNMfynaReSGBHhgay6xs4r446XgQfKq56GsoMJHgyrTQWP114znJEj9s43rYM291iCCE8PhHfzFeGa9Gut?cluster=devnet
- Paid request 2 (`vault_pay`): https://explorer.solana.com/tx/5kcG8Mfsfc5dwKqbTL8D9T43Rn6ec6eDoLoZSAfsY1kb2XoS5fzWdHPu3u6cHyXx7vcZcSnUWaxmVKr5CAiWSMKF?cluster=devnet

The token in the demo is a throwaway 6-decimal test mint, not USDC.

### Program upgrade (9 Oct 2026, later the same day)

The program was upgraded again in slot 509162626 with Token-2022 vaults, score provenance
(`attest_score`) and the scorer committee instructions. `npm run demo:x402` was re-run against it:

- Vault from that run: https://explorer.solana.com/address/6xZ55qNRKUV6ZrHXk4j1R9o9mdVcvKGfSbyCCEMrSZT9?cluster=devnet
- Paid request (`vault_pay`): https://explorer.solana.com/tx/3yRN9sofX8ievRZbroLhE5K6gEdduEKF5uViBnTHYVLxyi2vbvvysGjrK6JpDhtJG6Lom5gxDakYZtbRC8jF2Gwe?cluster=devnet

The scorer committee is deployed but not activated on devnet: the scorer is still a single key.
