/**
 * @truva/sdk — TypeScript SDK for the Truva Protocol
 *
 * Trust-gated AI agent payments on Solana.
 * Browser-safe · Tree-shakeable · Anchor 1.0 compatible
 *
 * @example
 * ```ts
 * import { TruvaClient, TruvaError, derivePassportPDA } from "@truva/sdk";
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  derivePassportPDA,
  deriveConfigPDA,
  deriveMerchantPolicyPDA,
  deriveVaultPDA,
  deriveAssociatedTokenAddress,
} from "./pda";

// Instruction builders and account parsers (vaults, merchant policy, trust checks)
export {
  MAX_ALLOWLIST,
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
} from "./instructions";
export type {
  VaultPolicyInput,
  ProtocolConfigData,
  MerchantPolicyData,
  AgentVaultData,
} from "./instructions";

// x402-style paywall settled through an agent vault
export {
  TRUVA_VAULT_SCHEME,
  buildPaymentRequirements,
  createVaultPayment,
  settleVaultPayment,
  truvaPaywall,
  fetchWithVault,
  PaymentRejectedError,
} from "./x402";
export type {
  PaymentRequirements,
  PaywallOptions,
  SettledPayment,
  FetchWithVaultOptions,
} from "./x402";

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
// Usage: import { truvaPlugin }    from "@truva/sdk/eliza";
//        import { createTruvaTool } from "@truva/sdk/langchain";
export { truvaPlugin } from "./eliza";
export { createTruvaTool } from "./langchain";
export type { TruvaToolInput, TruvaToolResult, LangChainToolLike } from "./langchain";
