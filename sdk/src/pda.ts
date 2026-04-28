import { PublicKey } from "@solana/web3.js";

/**
 * On-chain program ID for the TrustGate program on devnet.
 *
 * To override at runtime (e.g. for a custom deployment) set the
 * `TRUVA_PROGRAM_ID` environment variable before importing the SDK:
 *
 * ```ts
 * process.env.TRUVA_PROGRAM_ID = "<your-program-id>";
 * import { TruvaClient } from "@truva/sdk";
 * ```
 *
 * @see https://explorer.solana.com/address/BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5?cluster=devnet
 */
export const TRUSTGATE_PROGRAM_ID = new PublicKey(
  (typeof process !== "undefined" && process.env?.TRUVA_PROGRAM_ID) ||
    "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5"
);

/**
 * Derive the Agent Passport PDA for a given agent public key.
 *
 * Seeds: `["passport", agentPubkey]`
 *
 * @param agentPubkey - The agent's wallet public key
 * @param programId - Override the default program ID (optional)
 * @returns `[pda, bump]` tuple
 */
export function derivePassportPDA(
  agentPubkey: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentPubkey.toBuffer()],
    programId
  );
}
