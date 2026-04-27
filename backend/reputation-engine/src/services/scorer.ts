/**
 * Truva Scoring Engine
 *
 * Calculates a trust score (0-100) from six signals and determines
 * the trust tier based on multi-signal thresholds.
 *
 * Scoring happens off-chain. Only tier changes trigger on-chain writes.
 */

import { query } from "../db/client";
import { setCachedScore, type CachedScore } from "../cache/redis";
import { updateOnChainTier } from "./chain-writer";

// ── Types ──

export type TrustTier = "Bronze" | "Silver" | "Gold" | "Platinum";

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
  zkScore: number;
  attestScore: number;
}

export interface AgentStats {
  txCount: number;
  successCount: number;
  uniqueCounterparties: number;
  ageInDays: number;
  zkProofCount: number;
  attestationCount: number;
}

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

  // Signal 5: ZK proofs submitted — 10 points
  const zkScore = Math.min(stats.zkProofCount / 5, 1.0) * 10;

  // Signal 6: Validator attestations — 5 points
  const attestScore = Math.min(stats.attestationCount / 3, 1.0) * 5;

  const totalScore = Math.round(
    volumeScore + successScore + diversityScore + ageScore + zkScore + attestScore
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
      zkScore: Math.round(zkScore * 100) / 100,
      attestScore: Math.round(attestScore * 100) / 100,
    },
  };
}

/**
 * Determine tier from multi-signal thresholds
 */
function calculateTier(stats: AgentStats, successRate: number): TrustTier {
  if (
    stats.txCount >= 100 &&
    successRate >= 0.95 &&
    stats.uniqueCounterparties >= 20 &&
    stats.attestationCount >= 3 &&
    stats.zkProofCount >= 3
  ) {
    return "Platinum";
  }

  if (
    stats.txCount >= 30 &&
    successRate >= 0.90 &&
    stats.uniqueCounterparties >= 10 &&
    stats.attestationCount >= 2 &&
    stats.zkProofCount >= 1
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

// ── Gather Stats from DB ──

/**
 * Gather all scoring signals from the database for an agent
 */
async function gatherStats(agentPubkey: string): Promise<AgentStats> {
  // Transaction counts
  const txResult = await query(
    `SELECT 
       COUNT(*) as tx_count,
       COUNT(*) FILTER (WHERE success = true) as success_count,
       COUNT(DISTINCT counterparty) FILTER (WHERE counterparty IS NOT NULL) as unique_counterparties
     FROM transactions WHERE agent_pubkey = $1`,
    [agentPubkey]
  );
  const txRow = txResult.rows[0] || {};

  // Account age
  const ageResult = await query(
    `SELECT registered_at FROM agents WHERE pubkey = $1`,
    [agentPubkey]
  );
  const registeredAt = ageResult.rows[0]?.registered_at;
  const ageInDays = registeredAt
    ? Math.floor((Date.now() - new Date(registeredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // ZK proofs
  const zkResult = await query(
    `SELECT COUNT(*) as count FROM zk_proofs WHERE agent_pubkey = $1`,
    [agentPubkey]
  );

  // Attestations
  const attestResult = await query(
    `SELECT COUNT(*) as count FROM attestations WHERE agent_pubkey = $1`,
    [agentPubkey]
  );

  return {
    txCount: parseInt(txRow.tx_count || "0", 10),
    successCount: parseInt(txRow.success_count || "0", 10),
    uniqueCounterparties: parseInt(txRow.unique_counterparties || "0", 10),
    ageInDays,
    zkProofCount: parseInt(zkResult.rows[0]?.count || "0", 10),
    attestationCount: parseInt(attestResult.rows[0]?.count || "0", 10),
  };
}

// ── Recalculate Score ──

/**
 * Recalculate score for an agent.
 *
 * 1. Gathers stats from DB
 * 2. Calculates new score and tier
 * 3. Updates Redis cache
 * 4. Only calls chain-writer if tier has changed
 * 5. Inserts row into score_history table
 * 6. Updates agents table
 */
export async function recalculateScore(agentPubkey: string): Promise<ScoreResult> {
  try {
    const stats = await gatherStats(agentPubkey);
    const result = calculateScore(stats);
    const successRate = stats.txCount > 0 ? stats.successCount / stats.txCount : 0;

    // Update Redis cache
    const cached: CachedScore = {
      score: result.score,
      tier: result.tier,
      txCount: stats.txCount,
      successRate: Math.round(successRate * 1000) / 1000,
      updatedAt: new Date().toISOString(),
    };
    await setCachedScore(agentPubkey, cached);

    // Check if tier changed
    const currentAgent = await query(
      `SELECT current_tier FROM agents WHERE pubkey = $1`,
      [agentPubkey]
    );
    const currentTier = currentAgent.rows[0]?.current_tier || "Bronze";

    // Only write on-chain if tier actually changed
    if (currentTier !== result.tier) {
      try {
        await updateOnChainTier(agentPubkey, result.score, result.tier);
        console.log(`⛓️  On-chain tier updated: ${agentPubkey} ${currentTier} → ${result.tier}`);
      } catch (err) {
        console.error(`Failed to update on-chain tier for ${agentPubkey}:`, err);
        // Don't fail the whole score update if chain write fails
      }
    }

    // Insert score history
    await query(
      `INSERT INTO score_history (agent_pubkey, score, tier) VALUES ($1, $2, $3)`,
      [agentPubkey, result.score, result.tier]
    );

    // Update agents table
    await query(
      `UPDATE agents SET current_score = $1, current_tier = $2, last_updated = NOW() WHERE pubkey = $3`,
      [result.score, result.tier, agentPubkey]
    );

    return result;
  } catch (err) {
    console.error(`Error recalculating score for ${agentPubkey}:`, err);
    throw err;
  }
}
