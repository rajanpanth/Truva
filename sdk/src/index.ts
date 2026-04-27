/**
 * Truva SDK
 *
 * TypeScript SDK for interacting with the Truva Protocol.
 * - getAgentScore() reads directly from on-chain Passport PDA
 * - requireTrustTier() throws TruvaError if tier is insufficient
 * - All other methods call the REST API
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN, Idl } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Constants
// ============================================================

export const TRUSTGATE_PROGRAM_ID = new PublicKey(
  "TRSTgateXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export type TrustTier = "Bronze" | "Silver" | "Gold" | "Platinum";

const TrustTierEnum: Record<TrustTier, object> = {
  Bronze: { bronze: {} },
  Silver: { silver: {} },
  Gold: { gold: {} },
  Platinum: { platinum: {} },
};

const TIER_RANK: Record<TrustTier, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

// ============================================================
// Types
// ============================================================

export type AgentProfile = {
  pubkey: string;
  tier: string;
  score: number;
  txCount: number;
  successRate: number;
  frozen: boolean;
  registeredAt: string;
};

export type ScoreHistory = {
  score: number;
  tier: string;
  recordedAt: string;
};

// ============================================================
// TruvaError
// ============================================================

export class TruvaError extends Error {
  public currentTier: string;
  public requiredTier: string;

  constructor(message: string, currentTier: string, requiredTier: string) {
    super(message);
    this.name = "TruvaError";
    this.currentTier = currentTier;
    this.requiredTier = requiredTier;
  }
}

// ============================================================
// PDA Derivation
// ============================================================

export function derivePassportPDA(
  agentPubkey: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentPubkey.toBuffer()],
    programId
  );
}

// ============================================================
// Truva SDK Class
// ============================================================

export class Truva {
  private connection: Connection;
  private wallet: Wallet;
  private apiUrl: string;
  private program: Program | null = null;

  constructor(
    connection: Connection,
    wallet: Wallet,
    apiUrl: string = "http://localhost:3001"
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.apiUrl = apiUrl.replace(/\/$/, "");
  }

  // ── Anchor Program Loader ──

  /**
   * Load the Anchor program from the IDL.
   * Tries to load from target/idl/trustgate.json first,
   * falls back to manual parsing if not available.
   */
  private async getProgram(): Promise<Program | null> {
    if (this.program) return this.program;

    try {
      const provider = new AnchorProvider(this.connection, this.wallet, {
        commitment: "confirmed",
      });

      const idlPaths = [
        path.resolve(__dirname, "../../target/idl/trustgate.json"),
        path.resolve(__dirname, "../../../target/idl/trustgate.json"),
        path.resolve(process.cwd(), "target/idl/trustgate.json"),
      ];

      let idl: Idl | null = null;
      for (const p of idlPaths) {
        try {
          idl = JSON.parse(fs.readFileSync(p, "utf-8"));
          break;
        } catch {
          continue;
        }
      }

      if (!idl) return null;

      this.program = new Program(idl, TRUSTGATE_PROGRAM_ID, provider);
      return this.program;
    } catch {
      return null;
    }
  }

  // ── On-Chain Methods ──

  /**
   * Get agent score directly from on-chain Passport PDA.
   * Uses Anchor IDL if available, falls back to manual parsing.
   */
  async getAgentScore(agentPubkey: PublicKey): Promise<{
    score: number;
    tier: TrustTier;
    txCount: number;
    successRate: number;
    frozen: boolean;
  }> {
    const [pda] = derivePassportPDA(agentPubkey);

    // Try Anchor IDL-based fetch first
    const program = await this.getProgram();
    if (program) {
      try {
        const account = await program.account.agentPassport.fetch(pda);
        const tierKey = Object.keys(account.trustTier as object)[0];
        const tierMap: Record<string, TrustTier> = {
          bronze: "Bronze",
          silver: "Silver",
          gold: "Gold",
          platinum: "Platinum",
        };
        const tier = tierMap[tierKey] || "Bronze";
        const txCount = (account.txCount as BN).toNumber();
        const successCount = (account.successCount as BN).toNumber();
        const successRate = txCount > 0 ? successCount / txCount : 0;

        return {
          score: account.trustScore as number,
          tier,
          txCount,
          successRate: Math.round(successRate * 1000) / 1000,
          frozen: account.frozen as boolean,
        };
      } catch {
        // Fall back to manual parsing
      }
    }

    // Fallback: Manual byte parsing
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) {
      throw new Error(`No passport found for agent ${agentPubkey.toBase58()}`);
    }

    const data = accountInfo.data;
    let offset = 8; // discriminator

    offset += 32; // agent
    offset += 32; // authority
    const trustScore = data[offset]; offset += 1;
    const tierByte = data[offset]; offset += 1;
    const txCount = Number(data.readBigUInt64LE(offset)); offset += 8;
    const successCount = Number(data.readBigUInt64LE(offset)); offset += 8;
    const frozen = data[offset] === 1;

    const tierMap: Record<number, TrustTier> = {
      0: "Bronze",
      1: "Silver",
      2: "Gold",
      3: "Platinum",
    };

    const tier = tierMap[tierByte] || "Bronze";
    const successRate = txCount > 0 ? successCount / txCount : 0;

    return {
      score: trustScore,
      tier,
      txCount,
      successRate: Math.round(successRate * 1000) / 1000,
      frozen,
    };
  }

  /**
   * Check if an agent meets the required trust tier.
   * Throws TruvaError if the tier is insufficient.
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

  // ── REST API Methods ──

  /**
   * Register an agent via the REST API
   */
  async register(agentPubkey: PublicKey): Promise<string> {
    const response = await this.apiCall("POST", "/api/agents/register", {
      pubkey: agentPubkey.toBase58(),
    });

    return response.data?.pubkey || agentPubkey.toBase58();
  }

  /**
   * Get full agent profile from the REST API
   */
  async getAgentProfile(agentPubkey: PublicKey): Promise<AgentProfile> {
    const response = await this.apiCall(
      "GET",
      `/api/agents/${agentPubkey.toBase58()}`
    );

    const d = response.data;
    return {
      pubkey: d.pubkey,
      tier: d.current_tier,
      score: d.current_score,
      txCount: d.tx_count || 0,
      successRate: d.success_rate || 0,
      frozen: d.frozen || false,
      registeredAt: d.registered_at,
    };
  }

  /**
   * Get score history for an agent from the REST API
   */
  async getScoreHistory(agentPubkey: PublicKey): Promise<ScoreHistory[]> {
    const response = await this.apiCall(
      "GET",
      `/api/agents/${agentPubkey.toBase58()}/history`
    );

    return (response.data || []).map((item: any) => ({
      score: item.score,
      tier: item.tier,
      recordedAt: item.recorded_at,
    }));
  }

  /**
   * Check if an agent is eligible for a given tier and amount
   */
  async isEligible(
    agentPubkey: PublicKey,
    requiredTier: string,
    amount: number
  ): Promise<boolean> {
    try {
      const response = await this.apiCall(
        "GET",
        `/api/agents/${agentPubkey.toBase58()}/score`
      );

      const data = response.data;
      const agentRank = TIER_RANK[data.tier as TrustTier] ?? 0;
      const requiredRank = TIER_RANK[requiredTier as TrustTier] ?? 0;

      if (agentRank < requiredRank) return false;

      const tierLimits: Record<string, number> = {
        Bronze: 5_000_000_000,
        Silver: 100_000_000_000,
        Gold: Number.MAX_SAFE_INTEGER,
        Platinum: Number.MAX_SAFE_INTEGER,
      };

      const limit = tierLimits[data.tier] || 0;
      return amount <= limit;
    } catch {
      return false;
    }
  }

  // ── Private Helpers ──

  /**
   * Make an API call with retry logic (3 retries, exponential backoff)
   */
  private async apiCall(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `API call failed: ${response.status}`
          );
        }

        return response.json();
      } catch (err: any) {
        lastError = err;

        // Don't retry on 4xx errors
        if (err.message?.includes("4")) break;

        // Exponential backoff: 200ms, 800ms, 3200ms
        if (attempt < 2) {
          const delay = 200 * Math.pow(4, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw lastError || new Error("API call failed after 3 retries");
  }
}

// ============================================================
// Legacy Exports (backward compatibility)
// ============================================================

export { TrustTierEnum, TIER_RANK };
