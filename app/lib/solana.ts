import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";

// Program ID - deployed to devnet
export const TRUSTGATE_PROGRAM_ID = new PublicKey(
  "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5"
);

export const SOLANA_CLUSTER = "devnet";

export function getConnection(): Connection {
  return new Connection(clusterApiUrl(SOLANA_CLUSTER), "confirmed");
}

/**
 * Derive the Passport PDA for a given agent pubkey
 * Seeds: ["passport", agent_pubkey] — matches the Anchor program
 */
export function getPassportPDA(agentPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentPubkey.toBuffer()],
    TRUSTGATE_PROGRAM_ID
  );
}

/**
 * Trust tier enum mapping (matches the on-chain Rust enum)
 * Bronze=0, Silver=1, Gold=2, Platinum=3
 */
export const TrustTierMap = {
  Bronze: { bronze: {} },
  Silver: { silver: {} },
  Gold: { gold: {} },
  Platinum: { platinum: {} },
} as const;

export type TrustTierKey = keyof typeof TrustTierMap;

/**
 * Get the Anchor program instance (requires wallet connection)
 */
export function getTrustGateProgram(
  provider: AnchorProvider,
  idl: Idl
): Program {
  return new Program(idl as any, provider);
}
