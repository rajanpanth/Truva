/**
 * Risk Rules — anomaly detection for agent activity
 *
 * Pure functions with no database or network imports, so they can be
 * unit-tested directly. Used by risk-monitor.ts.
 */

// ── Types ──

export interface RecentTx {
  success: boolean;
  counterparty: string | null;
  /** Unix timestamp in seconds */
  timestamp: number;
}

export interface RiskThresholds {
  /** Length of the window that is inspected, in seconds */
  windowSecs: number;
  /** Transactions in the window at or above this count is a burst */
  maxTxInWindow: number;
  /** Distinct counterparties in the window at or above this count is a spray */
  maxCounterpartiesInWindow: number;
  /** Minimum transactions in the window before the failure rate is judged */
  minTxForFailureRate: number;
  /** Failure rate in the window at or above this (0-1) is anomalous */
  maxFailureRate: number;
}

export type RiskReason = "tx_burst" | "counterparty_spray" | "failure_spike";

export interface RiskVerdict {
  anomalous: boolean;
  reasons: RiskReason[];
  txInWindow: number;
  counterpartiesInWindow: number;
  failureRate: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  windowSecs: Number(process.env.RISK_WINDOW_SECS) || 600,
  maxTxInWindow: Number(process.env.RISK_MAX_TX) || 30,
  maxCounterpartiesInWindow: Number(process.env.RISK_MAX_COUNTERPARTIES) || 15,
  minTxForFailureRate: Number(process.env.RISK_MIN_TX_FOR_FAILURE_RATE) || 10,
  maxFailureRate: Number(process.env.RISK_MAX_FAILURE_RATE) || 0.6,
};

// ── Detection ──

/**
 * Judge an agent's transactions against the thresholds.
 * Only transactions inside `[now - windowSecs, now]` are considered.
 */
export function detectAnomaly(
  txs: RecentTx[],
  now: number,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS
): RiskVerdict {
  const windowStart = now - thresholds.windowSecs;
  const inWindow = txs.filter((tx) => tx.timestamp >= windowStart && tx.timestamp <= now);

  const counterparties = new Set(
    inWindow.map((tx) => tx.counterparty).filter((c): c is string => !!c)
  );
  const failures = inWindow.filter((tx) => !tx.success).length;
  const failureRate = inWindow.length > 0 ? failures / inWindow.length : 0;

  const reasons: RiskReason[] = [];
  if (inWindow.length >= thresholds.maxTxInWindow) {
    reasons.push("tx_burst");
  }
  if (counterparties.size >= thresholds.maxCounterpartiesInWindow) {
    reasons.push("counterparty_spray");
  }
  if (
    inWindow.length >= thresholds.minTxForFailureRate &&
    failureRate >= thresholds.maxFailureRate
  ) {
    reasons.push("failure_spike");
  }

  return {
    anomalous: reasons.length > 0,
    reasons,
    txInWindow: inWindow.length,
    counterpartiesInWindow: counterparties.size,
    failureRate: Math.round(failureRate * 1000) / 1000,
  };
}
