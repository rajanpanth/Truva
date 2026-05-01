/**
 * Shared types for the Truva Protocol SDK.
 */

// ============================================================
// Trust Tiers
// ============================================================

/** The four trust tiers used by the Truva Protocol. */
export type TrustTier = "Bronze" | "Silver" | "Gold" | "Platinum";

/** Internal rank map used for tier comparisons. */
export const TIER_RANK: Record<TrustTier, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

/**
 * Per-tier payment limits expressed in **lamports** (1 SOL = 1_000_000_000 lamports).
 *
 * | Tier     | Limit (lamports)    | Limit (SOL) |
 * |----------|---------------------|-------------|
 * | Bronze   | 5_000_000_000       | 5 SOL       |
 * | Silver   | 100_000_000_000     | 100 SOL     |
 * | Gold     | unlimited           | unlimited   |
 * | Platinum | unlimited           | unlimited   |
 */
export const TIER_LIMITS_LAMPORTS: Record<TrustTier, number> = {
  Bronze: 5_000_000_000,        // 5 SOL
  Silver: 100_000_000_000,      // 100 SOL
  Gold: Number.MAX_SAFE_INTEGER,
  Platinum: Number.MAX_SAFE_INTEGER,
};

// ============================================================
// Client Config
// ============================================================

export interface TruvaClientConfig {
  /**
   * Signer wallet — required only for write operations.
   * Import `Wallet` from `@anchor-lang/core` or pass any object
   * with `publicKey`, `signTransaction`, and `signAllTransactions`.
   */
  wallet?: {
    publicKey: import("@solana/web3.js").PublicKey;
    signTransaction: <T extends import("@solana/web3.js").Transaction>(tx: T) => Promise<T>;
    signAllTransactions: <T extends import("@solana/web3.js").Transaction>(txs: T[]) => Promise<T[]>;
  };

  /**
   * Base URL for the Truva reputation REST API.
   * @default "http://localhost:3001"
   */
  apiUrl?: string;

  /**
   * Solana commitment level for on-chain reads.
   * @default "confirmed"
   */
  commitment?: import("@solana/web3.js").Commitment;
}

// ============================================================
// On-chain / API response types
// ============================================================

/** Trust data read directly from the on-chain Passport PDA. */
export type AgentPassportData = {
  score: number;
  tier: TrustTier;
  txCount: number;
  successRate: number;
  frozen: boolean;
};

/** Full agent profile returned by the reputation REST API. */
export type AgentProfile = {
  pubkey: string;
  tier: string;
  score: number;
  txCount: number;
  successRate: number;
  frozen: boolean;
  registeredAt: string;
};

/** Single historical score snapshot from the REST API. */
export type ScoreHistory = {
  score: number;
  tier: string;
  recordedAt: string;
};

// ============================================================
// Agent Registration
// ============================================================

/** Valid task types accepted by the Truva Protocol. */
export type TaskType =
  | "trading"
  | "yield"
  | "data"
  | "execution"
  | "risk"
  | "treasury"
  | "monitoring"
  | "payment";

/** Valid chains supported by the Truva Protocol. */
export type SupportedChain = "solana" | "ethereum" | "base" | "arbitrum";

/** Spending behavior profile for the agent. */
export type SpendingBehavior = "conservative" | "standard" | "aggressive";

/**
 * Configuration required to register a new agent via the SDK.
 *
 * @example
 * ```ts
 * const config: RegisterAgentConfig = {
 *   name: "ArbitrageBot_v2",
 *   public_key: "7XsJcQk...",
 *   operator_name: "Alice Chen",
 *   operator_email: "alice@example.com",
 *   task_type: "trading",
 *   max_tx_size: 10000,
 *   rate_limit: 100,
 *   chains: ["solana"],
 * };
 * ```
 */
export interface RegisterAgentConfig {
  /** Agent display name (2–64 characters). */
  name: string;
  /** Solana public key (base58, 32–44 chars). Auto-filled if wallet is connected. */
  public_key: string;
  /** Name of the operator / team running this agent. */
  operator_name: string;
  /** Contact email for the operator. */
  operator_email: string;
  /** Primary task category for the agent. */
  task_type: TaskType;
  /** Optional description (max 500 chars). */
  description?: string;
  /** Maximum transaction size per epoch. */
  max_tx_size: number;
  /** Maximum transactions per hour. */
  rate_limit: number;
  /** Chains the agent operates on (at least one required). */
  chains: SupportedChain[];
  /** Spending behavior profile. @default "standard" */
  spending_behavior?: SpendingBehavior;
  /** Optional JSON-serializable metadata object. */
  metadata?: Record<string, unknown>;
}

/** Response returned after successful agent registration. */
export interface RegisterAgentResult {
  /** The agent's UUID assigned by the protocol. */
  id: string;
  /** The agent's name. */
  name: string;
  /** The agent's Solana public key. */
  public_key: string;
  /** Initial trust score (always 50). */
  trust_score: number;
  /** Initial tier (always 1 = Bronze). */
  tier: number;
}
