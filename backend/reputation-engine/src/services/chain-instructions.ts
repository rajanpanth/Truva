/**
 * Chain Instructions — TrustGate instruction builders used by the chain writer
 *
 * Pure functions over `@solana/web3.js`: no IDL file, no environment and no
 * network, so they work in the production image (which does not ship the
 * Anchor build output) and can be unit-tested directly.
 * Layouts mirror `sdk/src/instructions.ts`.
 */

import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import type { TrustTier } from "./score-rules";

/** Anchor instruction discriminators: `sha256("global:<name>")[0..8]`. */
const DISCRIMINATORS = {
  update_trust_tier: [65, 69, 142, 140, 227, 164, 233, 94],
  attest_score: [43, 103, 32, 97, 108, 253, 99, 3],
  freeze_passport: [180, 250, 70, 116, 94, 104, 160, 193],
};

const TIER_INDEX: Record<TrustTier, number> = { Bronze: 0, Silver: 1, Gold: 2 };
const TIER_BY_INDEX: TrustTier[] = ["Bronze", "Silver", "Gold"];

/** Byte offset of `trust_tier` in an `AgentPassport` account (discriminator, agent, authority, trust_score) */
const PASSPORT_TIER_OFFSET = 8 + 32 + 32 + 1;

/** Where a score came from, written on-chain next to the score. */
export interface ScoreProvenance {
  /** SHA-256 of the canonical scoring inputs (32 bytes) */
  inputsHash: Uint8Array;
  modelVersion: number;
  /** The agent's Solana Agent Registry asset, when it has one */
  registryAsset?: string | null;
}

export function derivePassportPDA(agent: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("passport"), agent.toBuffer()], programId)[0];
}

export function deriveScoreRecordPDA(agent: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("score"), agent.toBuffer()], programId)[0];
}

/** Read the tier from raw `AgentPassport` account data. */
export function parsePassportTier(data: Uint8Array): TrustTier {
  return TIER_BY_INDEX[data[PASSPORT_TIER_OFFSET]] ?? "Bronze";
}

/** `update_trust_tier(new_score, new_tier)`, signed by the scorer. */
export function updateTrustTierIx(
  agent: PublicKey,
  authority: PublicKey,
  score: number,
  tier: TrustTier,
  programId: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: derivePassportPDA(agent, programId), isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([...DISCRIMINATORS.update_trust_tier, score, TIER_INDEX[tier]]),
  });
}

/**
 * `attest_score(score, inputs_hash, model_version, registry_asset)`, signed by
 * the scorer. Writes the provenance record; the program derives the tier from
 * the score.
 */
export function attestScoreIx(
  agent: PublicKey,
  authority: PublicKey,
  score: number,
  provenance: ScoreProvenance,
  programId: PublicKey
): TransactionInstruction {
  if (provenance.inputsHash.length !== 32) {
    throw new Error("inputsHash must be 32 bytes (SHA-256)");
  }
  const version = Buffer.alloc(2);
  version.writeUInt16LE(provenance.modelVersion);
  const registry = provenance.registryAsset
    ? new PublicKey(provenance.registryAsset)
    : PublicKey.default;

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: derivePassportPDA(agent, programId), isSigner: false, isWritable: true },
      { pubkey: deriveScoreRecordPDA(agent, programId), isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from(DISCRIMINATORS.attest_score),
      Buffer.from([score]),
      Buffer.from(provenance.inputsHash),
      version,
      registry.toBuffer(),
    ]),
  });
}

/**
 * Instructions that set an agent's score and tier.
 *
 * With provenance, `attest_score` records where the score came from, then
 * `update_trust_tier` sets the tier the scoring rules chose: `attest_score`
 * alone would derive the tier from the score, and the rules also look at
 * signals the score does not capture. Both run in one transaction.
 */
export function scoreUpdateInstructions(
  agent: PublicKey,
  authority: PublicKey,
  score: number,
  tier: TrustTier,
  programId: PublicKey,
  provenance?: ScoreProvenance
): TransactionInstruction[] {
  const update = updateTrustTierIx(agent, authority, score, tier, programId);
  return provenance
    ? [attestScoreIx(agent, authority, score, provenance, programId), update]
    : [update];
}

/** `freeze_passport()`, signed by the scorer. */
export function freezePassportIx(
  agent: PublicKey,
  authority: PublicKey,
  programId: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: derivePassportPDA(agent, programId), isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(DISCRIMINATORS.freeze_passport),
  });
}
