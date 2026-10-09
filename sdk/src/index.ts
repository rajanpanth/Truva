/**
 * @truva-protocol/sdk — TypeScript SDK for the Truva Protocol
 *
 * Trust-gated AI agent payments on Solana.
 * Browser-safe · Tree-shakeable · Anchor 1.0 compatible
 *
 * @example
 * ```ts
 * import { TruvaClient, TruvaError, derivePassportPDA } from "@truva-protocol/sdk";
 * ```
 */

// Core client
export { TruvaClient } from "./client";

// AI agent utilities
export { AgentWallet, wrapWithTrustGate } from "./agent";

// PDA utilities
export {
  TRUSTGATE_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  derivePassportPDA,
  deriveConfigPDA,
  deriveMerchantPolicyPDA,
  deriveVaultPDA,
  deriveAssociatedTokenAddress,
  deriveScoreRecordPDA,
  deriveCommitteePDA,
  deriveProposalPDA,
} from "./pda";

// Instruction builders and account parsers (vaults, merchant policy, trust checks)
export {
  MAX_ALLOWLIST,
  MAX_COMMITTEE,
  PROGRAM_ERRORS,
  initializePassportIx,
  verifyTrustIx,
  setMerchantPolicyIx,
  closeMerchantPolicyIx,
  createVaultIx,
  updateVaultPolicyIx,
  setVaultPausedIx,
  vaultPayIx,
  vaultWithdrawIx,
  closeVaultIx,
  parseConfigAccount,
  parseMerchantPolicyAccount,
  parseVaultAccount,
  attestScoreIx,
  setCommitteeIx,
  committeeVoteIx,
  committeeSetFrozenIx,
  parseScoreRecordAccount,
  parseCommitteeAccount,
} from "./instructions";
export type {
  VaultPolicyInput,
  ProtocolConfigData,
  MerchantPolicyData,
  AgentVaultData,
  ScoreAttestation,
  ScoreRecordData,
  ScorerCommitteeData,
} from "./instructions";

// x402 paywall settled through an agent vault
export {
  TRUVA_VAULT_SCHEME,
  X402_HEADERS,
  SOLANA_CAIP2_NETWORKS,
  toCaip2Network,
  fromCaip2Network,
  encodeX402Header,
  decodeX402Header,
  buildPaymentRequired,
  buildPaymentRequiredV2,
  toPaymentRequirementsV2,
  selectVaultRequirements,
  encodePaymentPayload,
  decodePaymentPayload,
  decodeSettlementResponse,
  buildPaymentRequirements,
  createVaultPayment,
  settleVaultPayment,
  truvaPaywall,
  fetchWithVault,
  PaymentRejectedError,
} from "./x402";
export type {
  X402Version,
  TruvaVaultExtra,
  PaymentRequirements,
  PaymentRequirementsV2,
  PaymentRequiredV1,
  PaymentRequiredV2,
  ResourceInfo,
  DecodedPaymentPayload,
  SettlementResponse,
  PaywallOptions,
  SettledPayment,
  FetchWithVaultOptions,
} from "./x402";

// Standard x402 `exact` scheme, settled through a facilitator
export {
  EXACT_SCHEME,
  createFacilitatorClient,
  findExactFeePayer,
  buildExactRequirements,
  toExactRequirementsV2,
  FacilitatorError,
} from "./x402-exact";
export type {
  ExactSchemeOptions,
  FacilitatorHeaders,
  FacilitatorEndpoint,
  FacilitatorClient,
  FacilitatorRequest,
  FacilitatorVerifyResponse,
  FacilitatorSettleResponse,
  FacilitatorSupportedKind,
  FacilitatorSupportedResponse,
  ExactSvmExtra,
  ExactPaymentRequirements,
  ExactPaymentRequirementsV2,
} from "./x402-exact";

// Errors
export { TruvaError, InsufficientTierError, AgentFrozenError } from "./errors";

// Types
export type {
  TrustTier,
  TruvaClientConfig,
  AgentPassportData,
  AgentProfile,
  ScoreHistory,
  RegisterAgentConfig,
  RegisterAgentResult,
  TaskType,
  SupportedChain,
  SpendingBehavior,
} from "./types";
export { TIER_RANK, TIER_LIMITS_LAMPORTS } from "./types";

// ── Backward-compatibility alias ──────────────────────────────────────────────
// `Truva` was the original class name. Prefer `TruvaClient` in new code.
export { TruvaClient as Truva } from "./client";

// ── Framework integrations ────────────────────────────────────────────────────
// Imported separately to avoid bundling framework deps in the core bundle.
// Usage: import { truvaPlugin }    from "@truva-protocol/sdk/eliza";
//        import { createTruvaTool } from "@truva-protocol/sdk/langchain";
export { truvaPlugin } from "./eliza";
export { createTruvaTool } from "./langchain";
export type { TruvaToolInput, TruvaToolResult, LangChainToolLike } from "./langchain";
