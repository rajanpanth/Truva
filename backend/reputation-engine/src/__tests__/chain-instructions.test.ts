/**
 * Unit tests for chain-instructions.ts and the score provenance helpers
 * (pure functions — no DB/network needed)
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  attestScoreIx,
  derivePassportPDA,
  deriveScoreRecordPDA,
  freezePassportIx,
  parsePassportTier,
  scoreUpdateInstructions,
  updateTrustTierIx,
} from "../services/chain-instructions";
import {
  SCORE_MODEL_VERSION,
  canonicalScoringInputs,
  hashScoringInputs,
  type AgentStats,
} from "../services/score-rules";

const PROGRAM = new PublicKey("BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5");
const agent = Keypair.generate().publicKey;
const scorer = Keypair.generate().publicKey;

/** Anchor's rule for instruction discriminators */
const discriminator = (name: string) =>
  createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);

const STATS: AgentStats = {
  txCount: 42,
  successCount: 40,
  uniqueCounterparties: 9,
  ageInDays: 30,
  registryFeedbacks: 4,
  registryAvgScore: 77,
  attestationCount: 2,
};

describe("score provenance", () => {
  it("hashes a canonical text that names the agent, the model and every input", () => {
    const text = canonicalScoringInputs(agent.toBase58(), STATS);
    assert.deepEqual(JSON.parse(text), {
      agent: agent.toBase58(),
      modelVersion: SCORE_MODEL_VERSION,
      ...STATS,
    });
    assert.equal(hashScoringInputs(text).length, 32);
    assert.deepEqual(hashScoringInputs(text), createHash("sha256").update(text).digest());
  });

  it("is stable for equal inputs and changes when any input changes", () => {
    const base = hashScoringInputs(canonicalScoringInputs(agent.toBase58(), STATS));
    // Key order of the stats object must not matter
    const reordered = Object.fromEntries(Object.entries(STATS).reverse()) as unknown as AgentStats;
    assert.deepEqual(hashScoringInputs(canonicalScoringInputs(agent.toBase58(), reordered)), base);

    for (const key of Object.keys(STATS) as (keyof AgentStats)[]) {
      const changed = hashScoringInputs(
        canonicalScoringInputs(agent.toBase58(), { ...STATS, [key]: STATS[key] + 1 })
      );
      assert.notDeepEqual(changed, base, `${key} is not part of the hash`);
    }
    assert.notDeepEqual(
      hashScoringInputs(canonicalScoringInputs(Keypair.generate().publicKey.toBase58(), STATS)),
      base
    );
  });
});

describe("chain instructions", () => {
  it("builds update_trust_tier", () => {
    const ix = updateTrustTierIx(agent, scorer, 62, "Silver", PROGRAM);
    assert.deepEqual(ix.data.subarray(0, 8), discriminator("update_trust_tier"));
    assert.deepEqual([...ix.data.subarray(8)], [62, 1]);
    assert.equal(ix.keys[0].pubkey.toBase58(), derivePassportPDA(agent, PROGRAM).toBase58());
    assert.equal(ix.keys[0].isWritable, true);
    assert.equal(ix.keys[1].pubkey.toBase58(), scorer.toBase58());
    assert.equal(ix.keys[1].isSigner, true);
  });

  it("builds attest_score with the hash, model version and registry asset", () => {
    const inputsHash = hashScoringInputs("inputs");
    const registryAsset = Keypair.generate().publicKey;
    const ix = attestScoreIx(
      agent, scorer, 85,
      { inputsHash, modelVersion: 258, registryAsset: registryAsset.toBase58() },
      PROGRAM
    );
    assert.deepEqual(ix.data.subarray(0, 8), discriminator("attest_score"));
    assert.equal(ix.data[8], 85);
    assert.deepEqual(ix.data.subarray(9, 41), inputsHash);
    assert.equal(ix.data.readUInt16LE(41), 258);
    assert.deepEqual(ix.data.subarray(43, 75), registryAsset.toBuffer());
    assert.equal(ix.data.length, 75);

    assert.deepEqual(
      ix.keys.map((k) => k.pubkey.toBase58()),
      [
        derivePassportPDA(agent, PROGRAM),
        deriveScoreRecordPDA(agent, PROGRAM),
        scorer,
        SystemProgram.programId,
      ].map((k) => k.toBase58())
    );
    // The scorer pays for the record on first use
    assert.deepEqual(ix.keys.map((k) => k.isWritable), [true, true, true, false]);
  });

  it("writes the default key when the agent has no registry asset", () => {
    const ix = attestScoreIx(agent, scorer, 10, { inputsHash: hashScoringInputs("x"), modelVersion: 1 }, PROGRAM);
    assert.deepEqual(ix.data.subarray(43, 75), PublicKey.default.toBuffer());
  });

  it("rejects a hash that is not 32 bytes", () => {
    assert.throws(() =>
      attestScoreIx(agent, scorer, 10, { inputsHash: Buffer.alloc(31), modelVersion: 1 }, PROGRAM)
    );
  });

  it("attests first and sets the tier last, so the rules' tier is what stays", () => {
    const provenance = { inputsHash: hashScoringInputs("x"), modelVersion: 1 };
    const withProvenance = scoreUpdateInstructions(agent, scorer, 90, "Bronze", PROGRAM, provenance);
    assert.equal(withProvenance.length, 2);
    assert.deepEqual(withProvenance[0].data.subarray(0, 8), discriminator("attest_score"));
    assert.deepEqual(withProvenance[1].data.subarray(0, 8), discriminator("update_trust_tier"));
    assert.deepEqual([...withProvenance[1].data.subarray(8)], [90, 0]);

    const without = scoreUpdateInstructions(agent, scorer, 90, "Bronze", PROGRAM);
    assert.equal(without.length, 1);
    assert.deepEqual(without[0].data.subarray(0, 8), discriminator("update_trust_tier"));
  });

  it("builds freeze_passport", () => {
    const ix = freezePassportIx(agent, scorer, PROGRAM);
    assert.deepEqual(ix.data, discriminator("freeze_passport"));
    assert.equal(ix.keys[0].pubkey.toBase58(), derivePassportPDA(agent, PROGRAM).toBase58());
  });

  it("reads the tier from passport account data", () => {
    const data = Buffer.alloc(108);
    data[73] = 2;
    assert.equal(parsePassportTier(data), "Gold");
    data[73] = 0;
    assert.equal(parsePassportTier(data), "Bronze");
  });
});
