/**
 * Unit tests for scorer.ts (pure functions — no DB/network needed)
 *
 * Run: cd backend/reputation-engine && npx ts-mocha -p tsconfig.json src/__tests__/scorer.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTrustScore, mapScoreToTier } from "../scorer";

// ─────────────────────────────────────────────────────────────
// mapScoreToTier
// ─────────────────────────────────────────────────────────────
describe("mapScoreToTier", () => {
  it("returns Bronze for score 0", () => {
    assert.equal(mapScoreToTier(0), "Bronze");
  });

  it("returns Bronze for score 49", () => {
    assert.equal(mapScoreToTier(49), "Bronze");
  });

  it("returns Silver for score 50", () => {
    assert.equal(mapScoreToTier(50), "Silver");
  });

  it("returns Silver for score 79", () => {
    assert.equal(mapScoreToTier(79), "Silver");
  });

  it("returns Gold for score 80", () => {
    assert.equal(mapScoreToTier(80), "Gold");
  });

  it("returns Gold for score 100", () => {
    assert.equal(mapScoreToTier(100), "Gold");
  });
});

// ─────────────────────────────────────────────────────────────
// calculateTrustScore
// ─────────────────────────────────────────────────────────────
describe("calculateTrustScore", () => {
  it("returns score 0 and Bronze for zero txs and 0% success", () => {
    const result = calculateTrustScore({ transactionCount: 0, successRate: 0 });
    assert.equal(result.trustScore, 0);
    assert.equal(result.tier, "Bronze");
  });

  it("returns score 60 for 0 txs and 100% success (reliability only)", () => {
    const result = calculateTrustScore({ transactionCount: 0, successRate: 1 });
    assert.equal(result.trustScore, 60);
    assert.equal(result.tier, "Silver");
  });

  it("returns score 40 for 200 txs and 0% success (volume only)", () => {
    const result = calculateTrustScore({ transactionCount: 200, successRate: 0 });
    assert.equal(result.trustScore, 40);
    assert.equal(result.tier, "Bronze");
  });

  it("returns score 100 for 200 txs and 100% success", () => {
    const result = calculateTrustScore({ transactionCount: 200, successRate: 1 });
    assert.equal(result.trustScore, 100);
    assert.equal(result.tier, "Gold");
  });

  it("caps volume at 200 transactions", () => {
    const capped = calculateTrustScore({ transactionCount: 1000, successRate: 0 });
    const at200 = calculateTrustScore({ transactionCount: 200, successRate: 0 });
    assert.equal(capped.trustScore, at200.trustScore);
  });

  it("clamps successRate above 1 to 1", () => {
    const clamped = calculateTrustScore({ transactionCount: 0, successRate: 5 });
    const at1 = calculateTrustScore({ transactionCount: 0, successRate: 1 });
    assert.equal(clamped.trustScore, at1.trustScore);
  });

  it("clamps negative inputs to 0", () => {
    const result = calculateTrustScore({ transactionCount: -10, successRate: -0.5 });
    assert.equal(result.trustScore, 0);
    assert.equal(result.tier, "Bronze");
  });

  it("produces a Silver agent (100 txs, 80% success rate)", () => {
    // volume = (100/200)*40 = 20
    // reliability = 0.8*60 = 48
    // score = round(68) = 68 → Silver
    const result = calculateTrustScore({ transactionCount: 100, successRate: 0.8 });
    assert.equal(result.trustScore, 68);
    assert.equal(result.tier, "Silver");
  });

  it("score is always in [0, 100]", () => {
    const cases = [
      { transactionCount: 0, successRate: 0 },
      { transactionCount: 200, successRate: 1 },
      { transactionCount: 50, successRate: 0.5 },
      { transactionCount: 1000, successRate: 2 },
    ];
    for (const c of cases) {
      const { trustScore } = calculateTrustScore(c);
      assert.ok(trustScore >= 0 && trustScore <= 100, `Out of range: ${trustScore}`);
    }
  });
});
