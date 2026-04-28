/**
 * Agent Passport — Reputation Engine
 *
 * Simplified trust score calculator for hackathon demo.
 * In production this would index on-chain data via Helius webhooks.
 */

export type TrustTier = "Bronze" | "Silver" | "Gold";

export interface ReputationInput {
  transactionCount: number;
  successRate: number; // 0.0 to 1.0
}

export interface ReputationResult {
  trustScore: number; // 0 to 100
  tier: TrustTier;
}

/**
 * Calculate trust score from transaction history.
 *
 * Formula:
 *   base = min(transactionCount, 200) / 200 * 40     → max 40 pts from volume
 *   reliability = successRate * 60                    → max 60 pts from reliability
 *   score = round(base + reliability)                 → 0-100
 *
 * Tier mapping:
 *   0-49   → Bronze
 *   50-79  → Silver
 *   80-100 → Gold
 */
export function calculateTrustScore(input: ReputationInput): ReputationResult {
  const { transactionCount, successRate } = input;

  // Clamp inputs
  const clampedTxCount = Math.max(0, Math.min(transactionCount, 200));
  const clampedRate = Math.max(0, Math.min(successRate, 1));

  // Volume component: up to 40 points
  const volumeScore = (clampedTxCount / 200) * 40;

  // Reliability component: up to 60 points
  const reliabilityScore = clampedRate * 60;

  const trustScore = Math.round(volumeScore + reliabilityScore);
  const finalScore = Math.max(0, Math.min(100, trustScore));

  const tier = mapScoreToTier(finalScore);

  return { trustScore: finalScore, tier };
}

/**
 * Map a numeric score (0-100) to a TrustTier
 */
export function mapScoreToTier(score: number): TrustTier {
  if (score >= 80) return "Gold";
  if (score >= 50) return "Silver";
  return "Bronze";
}
