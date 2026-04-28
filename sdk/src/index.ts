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
export { TRUSTGATE_PROGRAM_ID, derivePassportPDA } from "./pda";

// Error
export { TruvaError } from "./errors";

// Types
export type {
  TrustTier,
  TruvaClientConfig,
  AgentPassportData,
  AgentProfile,
  ScoreHistory,
} from "./types";
export { TIER_RANK, TIER_LIMITS_LAMPORTS } from "./types";

// ── Backward-compatibility alias ──────────────────────────────────────────────
// `Truva` was the original class name. Prefer `TruvaClient` in new code.
export { TruvaClient as Truva } from "./client";
