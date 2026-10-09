/**
 * Chain Writer — Updates on-chain Passport PDA tier
 *
 * Derives the Passport PDA from seeds ["passport", agentPubkey], signs with
 * the backend authority keypair, and sends TrustGate instructions built in
 * chain-instructions.ts (no IDL file needed at runtime).
 *
 * Only writes when tier has actually changed to save SOL.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  derivePassportPDA,
  freezePassportIx,
  parsePassportTier,
  scoreUpdateInstructions,
  type ScoreProvenance,
} from "./chain-instructions";
import type { TrustTier } from "./score-rules";

// ── Config ──

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const TRUVA_PROGRAM_ID = process.env.TRUVA_PROGRAM_ID || "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5";
const BACKEND_AUTHORITY_KEY = process.env.BACKEND_AUTHORITY_KEY;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ── Connection + Authority Setup ──

let connection: Connection | null = null;
let authority: Keypair | null = null;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return connection;
}

function getAuthority(): Keypair {
  if (!authority) {
    if (!BACKEND_AUTHORITY_KEY) {
      throw new Error("BACKEND_AUTHORITY_KEY environment variable is not set");
    }
    try {
      // Try base58 first
      const decoded = bs58.decode(BACKEND_AUTHORITY_KEY);
      authority = Keypair.fromSecretKey(decoded);
    } catch {
      // Try JSON array format
      try {
        const keyArray = JSON.parse(BACKEND_AUTHORITY_KEY);
        authority = Keypair.fromSecretKey(Uint8Array.from(keyArray));
      } catch {
        throw new Error("BACKEND_AUTHORITY_KEY is not valid base58 or JSON array");
      }
    }
  }
  return authority;
}

const programId = () => new PublicKey(TRUVA_PROGRAM_ID);

// ── Read Current On-Chain Tier ──

export async function getOnChainTier(agentPubkey: string): Promise<string | null> {
  try {
    const pda = derivePassportPDA(new PublicKey(agentPubkey), programId());
    const account = await getConnection().getAccountInfo(pda);
    return account ? parsePassportTier(account.data) : null;
  } catch {
    return null;
  }
}

// ── Update On-Chain Tier ──

/**
 * Update the on-chain score and trust tier for an agent. With `provenance`,
 * the same transaction also records where the score came from.
 * Retries up to 3 times with 1 second delay between attempts.
 */
export async function updateOnChainTier(
  agentPubkey: string,
  score: number,
  newTier: string,
  provenance?: ScoreProvenance
): Promise<string | null> {
  const auth = getAuthority();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tx = new Transaction().add(
        ...scoreUpdateInstructions(
          new PublicKey(agentPubkey),
          auth.publicKey,
          score,
          newTier as TrustTier,
          programId(),
          provenance
        )
      );
      const signature = await sendAndConfirmTransaction(getConnection(), tx, [auth]);

      console.log(`✅ On-chain tier updated (attempt ${attempt}): ${signature}`);
      return signature;
    } catch (err: any) {
      console.error(
        `❌ Chain write attempt ${attempt}/${MAX_RETRIES} failed:`,
        err.message
      );

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  console.error(`Failed to update on-chain tier after ${MAX_RETRIES} attempts`);
  return null;
}

// ── Freeze On-Chain Passport ──

/**
 * Freeze an agent's passport on-chain. A frozen passport fails every
 * TrustGate check until the authority unfreezes it.
 * Returns the transaction signature, or null if the write failed.
 */
export async function freezeOnChain(agentPubkey: string): Promise<string | null> {
  const auth = getAuthority();

  try {
    const tx = new Transaction().add(
      freezePassportIx(new PublicKey(agentPubkey), auth.publicKey, programId())
    );
    return await sendAndConfirmTransaction(getConnection(), tx, [auth]);
  } catch (err: any) {
    console.error(`❌ Failed to freeze passport for ${agentPubkey}:`, err.message);
    return null;
  }
}
