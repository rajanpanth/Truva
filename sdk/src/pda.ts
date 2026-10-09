import { PublicKey } from "@solana/web3.js";

/**
 * On-chain program ID for the TrustGate program on devnet.
 *
 * To override at runtime (e.g. for a custom deployment) set the
 * `TRUVA_PROGRAM_ID` environment variable before importing the SDK:
 *
 * ```ts
 * process.env.TRUVA_PROGRAM_ID = "<your-program-id>";
 * import { TruvaClient } from "@truva-protocol/sdk";
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

/** SPL Token program (classic). Vaults do not support Token-2022. */
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

/** SPL Associated Token Account program. */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

/**
 * Derive the global protocol config PDA.
 *
 * Seeds: `["config"]`
 */
export function deriveConfigPDA(
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

/**
 * Derive the merchant policy PDA for a recipient wallet.
 *
 * Seeds: `["merchant", merchant]`
 */
export function deriveMerchantPolicyPDA(
  merchant: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant"), merchant.toBuffer()],
    programId
  );
}

/**
 * Derive the agent vault PDA.
 *
 * Seeds: `["vault", owner, agent, mint]`
 */
export function deriveVaultPDA(
  owner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer(), agent.toBuffer(), mint.toBuffer()],
    programId
  );
}

/**
 * Derive an associated token account address.
 * `owner` may be a PDA (e.g. a vault).
 */
export function deriveAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}
