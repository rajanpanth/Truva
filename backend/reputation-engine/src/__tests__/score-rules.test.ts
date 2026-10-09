/**
 * Unit tests for score-rules.ts (pure functions — no DB/network needed)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateScore, type AgentStats } from "../services/score-rules";

const GOLD: AgentStats = {
  txCount: 100,
  successCount: 100,
  uniqueCounterparties: 20,
  ageInDays: 60,
  registryFeedbacks: 5,
  registryAvgScore: 100,
  attestationCount: 3,
};

describe("calculateScore", () => {
  it("gives 100 and Gold when every signal is maxed", () => {
    const result = calculateScore(GOLD);
    assert.equal(result.score, 100);
    assert.equal(result.tier, "Gold");
    assert.equal(result.signals.registryScore, 10);
  });

  it("gives 0 and Bronze to a new agent", () => {
    const result = calculateScore({
      txCount: 0, successCount: 0, uniqueCounterparties: 0, ageInDays: 0,
      registryFeedbacks: 0, registryAvgScore: 0, attestationCount: 0,
    });
    assert.equal(result.score, 0);
    assert.equal(result.tier, "Bronze");
  });

  it("weights the registry signal by feedback count and average", () => {
    assert.equal(calculateScore({ ...GOLD, registryFeedbacks: 0 }).signals.registryScore, 0);
    // 2 of 5 feedbacks at an average of 80: 0.4 * 0.8 * 10
    assert.equal(
      calculateScore({ ...GOLD, registryFeedbacks: 2, registryAvgScore: 80 }).signals.registryScore,
      3.2
    );
  });

  it("requires a good Agent Registry reputation for Gold", () => {
    assert.equal(calculateScore({ ...GOLD, registryFeedbacks: 0, registryAvgScore: 0 }).tier, "Silver");
    assert.equal(calculateScore({ ...GOLD, registryFeedbacks: 1, registryAvgScore: 59 }).tier, "Silver");
    assert.equal(calculateScore({ ...GOLD, registryFeedbacks: 1, registryAvgScore: 60 }).tier, "Gold");
  });

  it("holds an agent with consistently bad registry feedback at Bronze", () => {
    const result = calculateScore({ ...GOLD, registryFeedbacks: 9, registryAvgScore: 0 });
    assert.equal(result.tier, "Bronze");
    // Two bad reports are not enough to override everything else
    assert.equal(calculateScore({ ...GOLD, registryFeedbacks: 2, registryAvgScore: 0 }).tier, "Silver");
  });

  it("keeps the Silver thresholds", () => {
    const silver: AgentStats = {
      txCount: 10, successCount: 8, uniqueCounterparties: 5, ageInDays: 1,
      registryFeedbacks: 0, registryAvgScore: 0, attestationCount: 1,
    };
    assert.equal(calculateScore(silver).tier, "Silver");
    assert.equal(calculateScore({ ...silver, successCount: 7 }).tier, "Bronze");
    assert.equal(calculateScore({ ...silver, attestationCount: 0 }).tier, "Bronze");
  });
});
