/**
 * Truva Scoring Engine
 *
 * Gathers an agent's signals, calculates a trust score (0-100) and tier
 * (rules in score-rules.ts), and writes the result on-chain.
 *
 * Scoring happens off-chain. Only tier changes trigger on-chain writes.
 */

import { query } from "../db/client";
import { setCachedScore, type CachedScore } from "../cache/redis";
import { updateOnChainTier } from "./chain-writer";
import { fetchRegistryReputation } from "./agent-registry";
import {
  SCORE_MODEL_VERSION,
  calculateScore,
  canonicalScoringInputs,
  hashScoringInputs,
  type AgentStats,
  type ScoreResult,
} from "./score-rules";

export { calculateScore } from "./score-rules";
export type { AgentStats, ScoreResult, ScoreSignals, TrustTier } from "./score-rules";

/** How long a stored Agent Registry reputation is reused before it is fetched again */
const REGISTRY_REFRESH_SECS = Number(process.env.AGENT_REGISTRY_REFRESH_SECS) || 3600;

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

  // Account age and stored Agent Registry reputation
  const ageResult = await query(
    `SELECT registered_at, registry_feedbacks, registry_avg_score, registry_synced_at
     FROM agents WHERE pubkey = $1`,
    [agentPubkey]
  );
  const registeredAt = ageResult.rows[0]?.registered_at;
  const ageInDays = registeredAt
    ? Math.floor((Date.now() - new Date(registeredAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Solana Agent Registry reputation (refreshed when stale)
  const registry = await syncRegistryReputation(agentPubkey, ageResult.rows[0]);

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
    registryFeedbacks: registry.feedbacks,
    registryAvgScore: registry.avgScore,
    attestationCount: parseInt(attestResult.rows[0]?.count || "0", 10),
  };
}

/** The agent's Solana Agent Registry asset, if a lookup ever found one. */
async function getRegistryAsset(agentPubkey: string): Promise<string | null> {
  const result = await query(`SELECT registry_asset FROM agents WHERE pubkey = $1`, [agentPubkey]);
  return result.rows[0]?.registry_asset || null;
}

// ── Agent Registry Sync ──

/**
 * Return the agent's Agent Registry reputation, fetching it from the registry
 * when the stored copy is older than REGISTRY_REFRESH_SECS.
 * An agent with no registry identity has zero feedbacks.
 */
async function syncRegistryReputation(
  agentPubkey: string,
  row: any
): Promise<{ feedbacks: number; avgScore: number }> {
  const stored = {
    feedbacks: Number(row?.registry_feedbacks) || 0,
    avgScore: Number(row?.registry_avg_score) || 0,
  };

  const syncedAt = row?.registry_synced_at ? new Date(row.registry_synced_at).getTime() : 0;
  if (Date.now() - syncedAt < REGISTRY_REFRESH_SECS * 1000) {
    return stored;
  }

  const reputation = await fetchRegistryReputation(agentPubkey);
  if (!reputation) {
    // Lookup failed or no identity: keep what we have, but don't retry on every recalculation
    await query(`UPDATE agents SET registry_synced_at = NOW() WHERE pubkey = $1`, [agentPubkey]);
    return stored;
  }

  await query(
    `UPDATE agents
     SET registry_asset = $1, registry_feedbacks = $2, registry_avg_score = $3, registry_synced_at = NOW()
     WHERE pubkey = $4`,
    [reputation.asset, reputation.totalFeedbacks, reputation.averageScore, agentPubkey]
  );
  return { feedbacks: reputation.totalFeedbacks, avgScore: reputation.averageScore };
}

// ── Recalculate Score ──

/**
 * Recalculate score for an agent.
 *
 * 1. Gathers stats from DB
 * 2. Calculates new score and tier
 * 3. Updates Redis cache
 * 4. Only calls chain-writer if tier has changed; the write carries the
 *    score's provenance (inputs hash, model version, Agent Registry asset)
 * 5. Inserts row into score_history table, with the inputs that were hashed
 * 6. Updates agents table
 */
export async function recalculateScore(agentPubkey: string): Promise<ScoreResult> {
  try {
    const stats = await gatherStats(agentPubkey);
    const result = calculateScore(stats);
    // What this score was computed from, published so the on-chain hash can be checked
    const inputs = canonicalScoringInputs(agentPubkey, stats);
    const inputsHash = hashScoringInputs(inputs);
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
        await updateOnChainTier(agentPubkey, result.score, result.tier, {
          inputsHash,
          modelVersion: SCORE_MODEL_VERSION,
          registryAsset: await getRegistryAsset(agentPubkey),
        });
        console.log(`⛓️  On-chain tier updated: ${agentPubkey} ${currentTier} → ${result.tier}`);
      } catch (err) {
        console.error(`Failed to update on-chain tier for ${agentPubkey}:`, err);
        // Don't fail the whole score update if chain write fails
      }
    }

    // Insert score history
    await query(
      `INSERT INTO score_history (agent_pubkey, score, tier, model_version, inputs_hash, inputs)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [agentPubkey, result.score, result.tier, SCORE_MODEL_VERSION, inputsHash.toString("hex"), inputs]
    );

    // Update agents table (reputation engine's own DB)
    await query(
      `UPDATE agents SET current_score = $1, current_tier = $2, last_updated = NOW() WHERE pubkey = $3`,
      [result.score, result.tier, agentPubkey]
    );

    // Sync score back to Supabase (the Next.js frontend DB)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const tierNum = result.tier === 'Gold' ? 3 : result.tier === 'Silver' ? 2 : 1;
      fetch(
        `${supabaseUrl}/rest/v1/agents?public_key=eq.${encodeURIComponent(agentPubkey)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            trust_score: result.score,
            tier: tierNum,
            updated_at: new Date().toISOString(),
          }),
        }
      ).catch((err) =>
        console.warn('Supabase sync failed (non-fatal):', err)
      );
    }

    return result;
  } catch (err) {
    console.error(`Error recalculating score for ${agentPubkey}:`, err);
    throw err;
  }
}
