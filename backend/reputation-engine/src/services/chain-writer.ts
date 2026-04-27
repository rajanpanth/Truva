/**
 * Chain Writer — Updates on-chain Passport PDA tier
 *
 * Derives the Passport PDA from seeds ["passport", agentPubkey],
 * signs with the backend authority keypair, and calls the
 * update_trust_tier instruction on the Anchor program.
 *
 * Only writes when tier has actually changed to save SOL.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import bs58 from "bs58";
import * as path from "path";
import * as fs from "fs";

// ── Config ──

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const TRUVA_PROGRAM_ID = process.env.TRUVA_PROGRAM_ID || "TRSTgateXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const BACKEND_AUTHORITY_KEY = process.env.BACKEND_AUTHORITY_KEY;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ── Tier Mapping ──

const TIER_MAP: Record<string, object> = {
  Bronze: { bronze: {} },
  Silver: { silver: {} },
  Gold: { gold: {} },
  Platinum: { platinum: {} },
};

const TIER_SCORE_MAP: Record<string, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

// ── Connection + Authority Setup ──

let connection: Connection | null = null;
let authority: Keypair | null = null;
let program: anchor.Program | null = null;

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

async function getProgram(): Promise<anchor.Program> {
  if (!program) {
    const conn = getConnection();
    const auth = getAuthority();
    const wallet = new anchor.Wallet(auth);
    const provider = new anchor.AnchorProvider(conn, wallet, {
      commitment: "confirmed",
    });

    // Load IDL
    const idlPath = path.resolve(__dirname, "../../../../target/idl/trustgate.json");
    let idl: anchor.Idl;
    try {
      idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    } catch {
      throw new Error(`IDL not found at ${idlPath}. Run 'anchor build' first.`);
    }

    const programId = new PublicKey(TRUVA_PROGRAM_ID);
    program = new (anchor.Program as any)(idl, programId, provider);
  }
  return program!;
}

// ── PDA Derivation ──

function derivePassportPDA(agentPubkey: string): [PublicKey, number] {
  const agentKey = new PublicKey(agentPubkey);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentKey.toBuffer()],
    new PublicKey(TRUVA_PROGRAM_ID)
  );
}

// ── Read Current On-Chain Tier ──

export async function getOnChainTier(agentPubkey: string): Promise<string | null> {
  try {
    const prog = await getProgram();
    const [pda] = derivePassportPDA(agentPubkey);
    const account = await (prog.account as any).agentPassport.fetch(pda);
    const tierKey = Object.keys(account.trustTier as object)[0];
    const tierMap: Record<string, string> = {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
    };
    return tierMap[tierKey] || "Bronze";
  } catch {
    return null;
  }
}

// ── Update On-Chain Tier ──

/**
 * Update the on-chain trust tier for an agent.
 * Retries up to 3 times with 1 second delay between attempts.
 */
export async function updateOnChainTier(
  agentPubkey: string,
  score: number,
  newTier: string
): Promise<string | null> {
  const [pda] = derivePassportPDA(agentPubkey);
  const auth = getAuthority();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prog = await getProgram();

      const tx = await prog.methods
        .updateTrustTier(score)
        .accounts({
          passport: pda,
          authority: auth.publicKey,
        })
        .rpc();

      console.log(`✅ On-chain tier updated (attempt ${attempt}): ${tx}`);
      return tx;
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
