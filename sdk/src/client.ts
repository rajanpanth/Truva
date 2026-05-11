/**
 * TruvaClient — main entry point for the Truva Protocol SDK.
 *
 * Browser-safe: uses only `@solana/web3.js` for on-chain reads.
 * No Node.js `fs`, `path`, or `__dirname` usage anywhere.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { getDomainKeySync } from "@bonfida/spl-name-service";
import type {
  AgentPassportData,
  AgentProfile,
  RegisterAgentConfig,
  RegisterAgentResult,
  ScoreHistory,
  TrustTier,
  TruvaClientConfig,
} from "./types";
import { TIER_LIMITS_LAMPORTS, TIER_RANK } from "./types";
import { TruvaError } from "./errors";
import { derivePassportPDA } from "./pda";

export class TruvaClient {
  private readonly connection: Connection;
  private readonly config: Required<Pick<TruvaClientConfig, "apiUrl" | "commitment">>;
  readonly wallet: TruvaClientConfig["wallet"];

  constructor(connection: Connection, config: TruvaClientConfig = {}) {
    this.connection = connection;
    this.wallet = config.wallet;
    this.config = {
      apiUrl: (config.apiUrl ?? "http://localhost:3001").replace(/\/$/, ""),
      commitment: config.commitment ?? "confirmed",
    };
  }

  // ── On-Chain Methods ──────────────────────────────────────────────────────

  /**
   * Read trust data directly from the on-chain Agent Passport PDA.
   *
   * Uses pure `@solana/web3.js` account fetch + manual Borsh layout parsing —
   * no Anchor Program or IDL file required. Safe for browsers and workers.
   */
  async getAgentScore(agentPubkey: PublicKey): Promise<AgentPassportData> {
    const [pda] = derivePassportPDA(agentPubkey);

    const accountInfo = await this.connection.getAccountInfo(pda, {
      commitment: this.config.commitment,
    });

    if (!accountInfo) {
      throw new Error(`No passport found for agent ${agentPubkey.toBase58()}`);
    }

    return parsePassportAccount(accountInfo.data);
  }

  // ── SNS Domain Resolution ─────────────────────────────────────────────────

  /**
   * Resolve an agent identifier to a PublicKey.
   * Accepts either a base58 pubkey string or a `.sol` domain name.
   *
   * @param nameOrPubkey - A Solana base58 address or an SNS `.sol` domain
   * @returns The resolved PublicKey
   *
   * @example
   * ```ts
   * const pubkey = await truva.resolveAgent("my-agent.sol");
   * const pubkey2 = await truva.resolveAgent("7XsJcQk...");
   * ```
   */
  async resolveAgent(nameOrPubkey: string): Promise<PublicKey> {
    if (nameOrPubkey.endsWith(".sol")) {
      const domainName = nameOrPubkey.replace(".sol", "");
      const { pubkey } = getDomainKeySync(domainName);

      // Verify the domain exists on-chain
      const domainInfo = await this.connection.getAccountInfo(pubkey);
      if (!domainInfo) {
        throw new Error(`SNS domain ${nameOrPubkey} not found on-chain`);
      }

      return pubkey;
    }

    return new PublicKey(nameOrPubkey);
  }

  /**
   * Look up an agent's trust score by `.sol` domain name or base58 pubkey.
   *
   * Combines `resolveAgent()` + `getAgentScore()` into a single call.
   *
   * @param nameOrPubkey - A Solana base58 address or an SNS `.sol` domain
   * @returns On-chain passport data (score, tier, txCount, etc.)
   *
   * @example
   * ```ts
   * const score = await truva.getAgentScoreByName("my-agent.sol");
   * console.log(score.tier); // "Gold"
   * ```
   */
  async getAgentScoreByName(nameOrPubkey: string): Promise<AgentPassportData> {
    const pubkey = await this.resolveAgent(nameOrPubkey);
    return this.getAgentScore(pubkey);
  }

  /**
   * Gate a call by trust tier — throws `TruvaError` if the agent doesn't
   * meet the required tier or if the passport is frozen.
   */
  async requireTrustTier(
    requiredTier: TrustTier,
    agentPubkey: PublicKey
  ): Promise<void> {
    const passport = await this.getAgentScore(agentPubkey);

    if (passport.frozen) {
      throw new TruvaError(
        `Agent ${agentPubkey.toBase58()} is frozen`,
        passport.tier,
        requiredTier
      );
    }

    const agentRank = TIER_RANK[passport.tier];
    const requiredRank = TIER_RANK[requiredTier];

    if (agentRank < requiredRank) {
      throw new TruvaError(
        `InsufficientTrust: Agent is ${passport.tier} (rank ${agentRank}) but ${requiredTier} (rank ${requiredRank}) is required`,
        passport.tier,
        requiredTier
      );
    }
  }

  // ── REST API Methods ──────────────────────────────────────────────────────

  /**
   * Register a new agent with the Truva Protocol.
   *
   * Sends the full registration payload to `POST /api/agents`.
   * The agent starts at trust score 50 (Bronze tier).
   *
   * @param config - Agent registration configuration
   * @returns The registered agent's ID, name, public key, score, and tier
   *
   * @example
   * ```ts
   * const result = await truva.register({
   *   name: "ArbitrageBot_v2",
   *   public_key: wallet.publicKey.toBase58(),
   *   operator_name: "Alice Chen",
   *   operator_email: "alice@example.com",
   *   task_type: "trading",
   *   description: "High-frequency DEX arbitrage agent",
   *   max_tx_size: 10000,
   *   rate_limit: 100,
   *   chains: ["solana"],
   *   spending_behavior: "aggressive",
   * });
   * console.log(`Agent registered: ${result.id}`);
   * ```
   */
  async register(config: RegisterAgentConfig): Promise<RegisterAgentResult> {
    // Basic client-side validation
    if (!config.name || config.name.length < 2) {
      throw new Error("Agent name must be at least 2 characters");
    }
    if (!config.public_key || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(config.public_key)) {
      throw new Error("Must be a valid Solana base58 address (32-44 characters)");
    }
    if (!config.operator_name) {
      throw new Error("Operator name is required");
    }
    if (!config.operator_email || !config.operator_email.includes("@")) {
      throw new Error("Must be a valid email address");
    }
    if (!config.chains || config.chains.length === 0) {
      throw new Error("At least one chain must be specified");
    }

    const body = {
      name: config.name,
      public_key: config.public_key,
      operator_name: config.operator_name,
      operator_email: config.operator_email,
      task_type: config.task_type,
      description: config.description,
      max_tx_size: config.max_tx_size,
      rate_limit: config.rate_limit,
      chains: config.chains,
      spending_behavior: config.spending_behavior ?? "standard",
      metadata: config.metadata ? JSON.stringify(config.metadata) : undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await this.apiCall("POST", "/api/agents", body);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const data = response.data as RegisterAgentResult;
    return data;
  }

  /** Fetch the full agent profile from the reputation engine. */
  async getAgentProfile(agentPubkey: PublicKey): Promise<AgentProfile> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await this.apiCall(
      "GET",
      `/api/agents/${agentPubkey.toBase58()}`
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const d = response.data as Record<string, unknown>;
    return {
      pubkey: d["pubkey"] as string,
      tier: d["current_tier"] as string,
      score: d["current_score"] as number,
      txCount: (d["tx_count"] as number | undefined) ?? 0,
      successRate: (d["success_rate"] as number | undefined) ?? 0,
      frozen: (d["frozen"] as boolean | undefined) ?? false,
      registeredAt: d["registered_at"] as string,
    };
  }

  /** Fetch historical score snapshots for an agent. */
  async getScoreHistory(agentPubkey: PublicKey): Promise<ScoreHistory[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await this.apiCall(
      "GET",
      `/api/agents/${agentPubkey.toBase58()}/history`
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const items: Record<string, unknown>[] = (response.data as Record<string, unknown>[] | undefined) ?? [];
    return items.map((item) => ({
      score: item["score"] as number,
      tier: item["tier"] as string,
      recordedAt: item["recorded_at"] as string,
    }));
  }

  /**
   * Check if an agent is eligible to receive a payment.
   *
   * @param agentPubkey - The agent's public key
   * @param requiredTier - The minimum trust tier required
   * @param amountLamports - Payment amount in **lamports** (1 SOL = 1_000_000_000)
   */
  async isEligible(
    agentPubkey: PublicKey,
    requiredTier: TrustTier,
    amountLamports: number
  ): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response = await this.apiCall(
        "GET",
        `/api/agents/${agentPubkey.toBase58()}/score`
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const data = response.data as { tier: TrustTier };

      const agentRank = TIER_RANK[data.tier] ?? 0;
      const requiredRank = TIER_RANK[requiredTier] ?? 0;
      if (agentRank < requiredRank) return false;

      const limit = TIER_LIMITS_LAMPORTS[data.tier] ?? 0;
      return amountLamports <= limit;
    } catch {
      return false;
    }
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  /**
   * HTTP helper with 3-attempt exponential backoff (200 ms → 800 ms → 3200 ms).
   * Does NOT retry on 4xx responses.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async apiCall(
    method: string,
    endpoint: string,
    body?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body !== undefined && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    let lastError: Error = new Error("API call failed");

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
          throw new Error(
            (errorData["error"] as string | undefined) ??
              `API call failed: ${response.status}`
          );
        }
        return response.json() as Promise<Record<string, unknown>>;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Don't retry on 4xx
        if (lastError.message.match(/^API call failed: 4\d{2}/)) break;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 200 * Math.pow(4, attempt)));
        }
      }
    }

    throw lastError;
  }
}

// ── Account Parser ────────────────────────────────────────────────────────────

const TIER_MAP: Record<number, TrustTier> = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
};

/**
 * Parse raw account bytes from an `AgentPassport` PDA.
 *
 * Layout (after 8-byte Anchor discriminator):
 * - agent:         32 bytes (Pubkey)
 * - authority:     32 bytes (Pubkey)
 * - trust_score:    1 byte  (u8)
 * - trust_tier:     1 byte  (enum u8)
 * - tx_count:       8 bytes (u64 LE)
 * - success_count:  8 bytes (u64 LE)
 * - frozen:         1 byte  (bool)
 * - created_at:     8 bytes (i64 LE) — skipped
 * - updated_at:     8 bytes (i64 LE) — skipped
 * - bump:           1 byte  — skipped
 */
function parsePassportAccount(data: Buffer): AgentPassportData {
  let offset = 8; // skip Anchor discriminator

  offset += 32; // agent pubkey
  offset += 32; // authority pubkey

  const trustScore = data[offset]; offset += 1;
  const tierByte   = data[offset]; offset += 1;

  const txCount      = Number(data.readBigUInt64LE(offset)); offset += 8;
  const successCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const frozen       = data[offset] === 1;

  const tier = TIER_MAP[tierByte] ?? "Bronze";
  const successRate = txCount > 0
    ? Math.round((successCount / txCount) * 1000) / 1000
    : 0;

  return { score: trustScore, tier, txCount, successRate, frozen };
}
