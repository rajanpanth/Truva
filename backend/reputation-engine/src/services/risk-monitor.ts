/**
 * Risk Monitor — automatic kill switch for compromised agents
 *
 * Looks at an agent's recent transactions for patterns that suggest the agent
 * has been hijacked (e.g. by prompt injection) or is misbehaving, and freezes
 * its on-chain passport. A frozen passport fails every TrustGate check,
 * including `vault_pay`, until the scorer unfreezes it.
 *
 * Detection rules live in risk-rules.ts.
 */

import { query } from "../db/client";
import { freezeOnChain } from "./chain-writer";
import { DEFAULT_THRESHOLDS, detectAnomaly, type RecentTx, type RiskVerdict } from "./risk-rules";

/** Freezing is consequential, so it only happens when explicitly enabled. */
export const AUTO_FREEZE_ENABLED = process.env.AUTO_FREEZE_ENABLED === "true";

// ── Evaluation ──

/**
 * Check an agent's recent activity and freeze its passport if it is anomalous.
 * Returns the verdict and whether a freeze transaction was sent.
 */
export async function evaluateAgentRisk(
  agentPubkey: string
): Promise<RiskVerdict & { frozen: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  const result = await query(
    `SELECT success, counterparty, timestamp
     FROM transactions
     WHERE agent_pubkey = $1 AND timestamp >= $2`,
    [agentPubkey, now - DEFAULT_THRESHOLDS.windowSecs]
  );

  const txs: RecentTx[] = result.rows.map((row: any) => ({
    success: row.success,
    counterparty: row.counterparty,
    timestamp: Number(row.timestamp),
  }));

  const verdict = detectAnomaly(txs, now);
  if (!verdict.anomalous) {
    return { ...verdict, frozen: false };
  }

  console.warn(
    `🚨 Risk monitor: ${agentPubkey} flagged (${verdict.reasons.join(", ")}) — ` +
      `${verdict.txInWindow} txs, ${verdict.counterpartiesInWindow} counterparties, ` +
      `failure rate ${verdict.failureRate}`
  );

  if (!AUTO_FREEZE_ENABLED) {
    console.warn("   AUTO_FREEZE_ENABLED is not 'true' — passport left unfrozen");
    return { ...verdict, frozen: false };
  }

  const signature = await freezeOnChain(agentPubkey);
  if (signature) {
    console.warn(`🧊 Passport frozen on-chain: ${signature}`);
  }
  return { ...verdict, frozen: signature !== null };
}
