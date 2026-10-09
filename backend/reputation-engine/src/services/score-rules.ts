/**
 * Score Rules — trust score and tier calculation
 *
 * Pure functions with no database or network imports, so they can be
 * unit-tested directly. Used by scorer.ts.
 */

// ── Types ──

export type TrustTier = "Bronze" | "Silver" | "Gold";

export interface ScoreResult {
  score: number;
  tier: TrustTier;
  signals: ScoreSignals;
}

export interface ScoreSignals {
  volumeScore: number;
  successScore: number;
  diversityScore: number;
  ageScore: number;
  registryScore: number;
  attestScore: number;
}

export interface AgentStats {
  txCount: number;
  successCount: number;
  uniqueCounterparties: number;
  ageInDays: number;
  /** Feedback entries the agent has on the Solana Agent Registry (ERC-8004) */
  registryFeedbacks: number;
  /** Average feedback score on the Solana Agent Registry, 0-100 */
  registryAvgScore: number;
  attestationCount: number;
}

/** Registry feedback count at which the registry signal reaches full weight */
const REGISTRY_FULL_WEIGHT_FEEDBACKS = 5;
/** Minimum registry average for the reputation to count towards Gold */
const REGISTRY_GOOD_AVG = 60;
/** With this many feedbacks and an average below REGISTRY_BAD_AVG, the agent is held at Bronze */
const REGISTRY_BAD_MIN_FEEDBACKS = 3;
const REGISTRY_BAD_AVG = 30;

// ── Score Calculation ──

/**
 * Calculate score 0-100 from six signals
 */
export function calculateScore(stats: AgentStats): ScoreResult {
  // Signal 1: Transaction volume — 25 points
  const volumeScore = Math.min(stats.txCount / 100, 1.0) * 25;

  // Signal 2: Success rate — 25 points
  const successRate = stats.txCount > 0
    ? stats.successCount / stats.txCount
    : 0;
  const successScore = successRate * 25;

  // Signal 3: Counterparty diversity — 20 points
  const diversityScore = Math.min(stats.uniqueCounterparties / 20, 1.0) * 20;

  // Signal 4: Account age in days — 15 points
  const ageScore = Math.min(stats.ageInDays / 60, 1.0) * 15;

  // Signal 5: Solana Agent Registry reputation — 10 points
  // Feedback volume sets the weight, average feedback score sets the value
  const registryScore =
    Math.min(stats.registryFeedbacks / REGISTRY_FULL_WEIGHT_FEEDBACKS, 1.0) *
    (Math.max(0, Math.min(100, stats.registryAvgScore)) / 100) *
    10;

  // Signal 6: Validator attestations — 5 points
  const attestScore = Math.min(stats.attestationCount / 3, 1.0) * 5;

  const totalScore = Math.round(
    volumeScore + successScore + diversityScore + ageScore + registryScore + attestScore
  );
  const score = Math.max(0, Math.min(100, totalScore));

  const tier = calculateTier(stats, successRate);

  return {
    score,
    tier,
    signals: {
      volumeScore: Math.round(volumeScore * 100) / 100,
      successScore: Math.round(successScore * 100) / 100,
      diversityScore: Math.round(diversityScore * 100) / 100,
      ageScore: Math.round(ageScore * 100) / 100,
      registryScore: Math.round(registryScore * 100) / 100,
      attestScore: Math.round(attestScore * 100) / 100,
    },
  };
}

/**
 * Determine tier from multi-signal thresholds
 */
export function calculateTier(stats: AgentStats, successRate: number): TrustTier {
  // Consistently bad feedback elsewhere in the ecosystem holds an agent at Bronze
  if (
    stats.registryFeedbacks >= REGISTRY_BAD_MIN_FEEDBACKS &&
    stats.registryAvgScore < REGISTRY_BAD_AVG
  ) {
    return "Bronze";
  }

  if (
    stats.txCount >= 30 &&
    successRate >= 0.90 &&
    stats.uniqueCounterparties >= 10 &&
    stats.attestationCount >= 2 &&
    stats.registryFeedbacks >= 1 &&
    stats.registryAvgScore >= REGISTRY_GOOD_AVG
  ) {
    return "Gold";
  }

  if (
    stats.txCount >= 10 &&
    successRate >= 0.80 &&
    stats.uniqueCounterparties >= 5 &&
    stats.attestationCount >= 1
  ) {
    return "Silver";
  }

  return "Bronze";
}
