# Truva compared with other agent-payment controls

How Truva relates to the other ways of giving an AI agent an identity, a budget, or a paywall to pay.

| Project | Agent identity / reputation | Spending controls | Merchant-side gating | Where enforcement happens | x402 |
|---|---|---|---|---|---|
| **Truva** | On-chain passport (score, tier, freeze) written by the protocol scorer | Vault limits: per-payment, rolling 24h, allowlist of 8 recipients, pause | Merchant sets a minimum tier, checked in the same instruction as the payment | The Solana program (no TEE, custodian or facilitator) | v1/v2 wire format with a custom `truva-vault` scheme |
| Solana Agent Registry / ERC-8004 ports | Identity and feedback registries | — | — | Registries only; no payment enforcement | — |
| t54 Labs x402-secure | Risk score per payment | — | Risk scoring before settlement | Off-chain, pre-settlement | Sits in front of x402 settlement |
| Crossmint agent wallets | No reputation | Caps and allowlists | — | Smart contract | — |
| Circle Agent Wallets | — | Caps and allowlists | — | Circle (mainnet) | — |
| Coinbase agentic wallets + x402 facilitator | — | Caps | — | Enclave; facilitator settles | Native `exact` scheme |
| Squads / Swig spending limits | No agent trust | On-chain limits | — | On-chain program | — |
| Kite | Passport | Limits | — | Its own chain | — |

A dash means this page makes no claim for that cell; it is not a verified absence.

Status on 9 October 2026: vaults accept SPL Token and Token-2022 mints (no transfer hooks). Scores can carry on-chain provenance (inputs hash, model version, Agent Registry ID). An M-of-N scorer committee is implemented in the program and tested, but the devnet deployment still runs with a single scorer key. Sellers can additionally accept the standard `exact` scheme through a facilitator (tested against a mocked facilitator only).

Competitor details are taken from public docs and press as of October 2026 and may be out of date.

## What is different about Truva

Most projects in this table solve one side of the problem. Registries say who an agent is but do not stop a payment. Wallet products cap what an agent can spend, which is a budget set by the payer rather than a judgement about the agent or a say for the party being paid. Off-chain risk scoring judges a payment before settlement, outside the program that moves the funds.

Truva puts three checks in one on-chain instruction:

1. **Payer limits**: the vault owner's per-payment cap, rolling 24h cap, recipient allowlist and pause switch.
2. **Payer trust**: the agent's passport must be issued by the protocol scorer and not frozen.
3. **Payee's minimum tier**: the merchant's own policy, read from the merchant's account.

If any check fails, the transfer does not happen. There is no enclave, custodian or facilitator in the path to trust or to go down.

## Planned next

Bounties for misbehaving agents: operators post a bond, anyone can report an agent with evidence, the scorer committee reviews it, and an upheld report freezes or downgrades the passport and pays the reporter from the bond. This is not built yet; the design is in the Roadmap section of the README.

## Current gaps

- **Devnet only.** Truva is not deployed to mainnet, while Circle Agent Wallets already run there.
- **Custom x402 scheme.** Truva speaks the x402 v1/v2 wire format, but `truva-vault` is its own scheme. A stock x402 client that only knows `exact` cannot pay a Truva paywall; the payer needs the Truva SDK.
