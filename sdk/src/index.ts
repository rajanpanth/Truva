import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";
import { Program, AnchorProvider, Idl, BN } from "@coral-xyz/anchor";

// ============================================================
// Constants
// ============================================================

export const TRUSTGATE_PROGRAM_ID = new PublicKey(
  "TRSTgateXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export type TrustTier = "Bronze" | "Silver" | "Gold";

const TrustTierEnum: Record<TrustTier, object> = {
  Bronze: { bronze: {} },
  Silver: { silver: {} },
  Gold: { gold: {} },
};

const TIER_RANK: Record<TrustTier, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
};

// ============================================================
// PDA Derivation
// ============================================================

/**
 * Derive the Passport PDA address for a given agent
 */
export function derivePassportPDA(agentPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentPubkey.toBuffer()],
    TRUSTGATE_PROGRAM_ID
  );
}

// ============================================================
// Core SDK Functions
// ============================================================

export interface PassportData {
  agentPubkey: PublicKey;
  trustScore: number;
  trustTier: TrustTier;
  transactionCount: number;
  authority: PublicKey;
  lastUpdated: number;
  bump: number;
}

/**
 * Fetch an agent's passport data from chain
 */
export async function getAgentPassport(
  connection: Connection,
  agentPubkey: PublicKey,
  program: Program
): Promise<PassportData | null> {
  const [pda] = derivePassportPDA(agentPubkey);
  try {
    const account = await program.account.agentPassport.fetch(pda);
    const tierMap: Record<string, TrustTier> = {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
    };
    const tierKey = Object.keys(account.trustTier as object)[0];
    return {
      agentPubkey: account.agentPubkey as PublicKey,
      trustScore: account.trustScore as number,
      trustTier: tierMap[tierKey] || "Bronze",
      transactionCount: account.transactionCount as number,
      authority: account.authority as PublicKey,
      lastUpdated: (account.lastUpdated as BN).toNumber(),
      bump: account.bump as number,
    };
  } catch {
    return null;
  }
}

/**
 * Check if an agent meets the required trust tier.
 * Returns true if the agent's tier >= required tier.
 * Throws an error if the passport doesn't exist.
 */
export async function requireTrustTier(
  requiredTier: TrustTier,
  agentPubkey: PublicKey,
  connection: Connection,
  program: Program
): Promise<boolean> {
  const passport = await getAgentPassport(connection, agentPubkey, program);

  if (!passport) {
    throw new Error(
      `No passport found for agent ${agentPubkey.toBase58()}. Agent is not registered.`
    );
  }

  const agentRank = TIER_RANK[passport.trustTier];
  const requiredRank = TIER_RANK[requiredTier];

  if (agentRank < requiredRank) {
    throw new Error(
      `InsufficientTrust: Agent is ${passport.trustTier} (rank ${agentRank}) ` +
        `but ${requiredTier} (rank ${requiredRank}) is required.`
    );
  }

  return true;
}

/**
 * Get the trust score and tier for an agent
 */
export async function getAgentTrustScore(
  agentPubkey: PublicKey,
  connection: Connection,
  program: Program
): Promise<{ tier: TrustTier; score: number; txCount: number }> {
  const passport = await getAgentPassport(connection, agentPubkey, program);

  if (!passport) {
    throw new Error(`No passport found for agent ${agentPubkey.toBase58()}`);
  }

  return {
    tier: passport.trustTier,
    score: passport.trustScore,
    txCount: passport.transactionCount,
  };
}

// ============================================================
// Exports
// ============================================================

export { TrustTierEnum };
