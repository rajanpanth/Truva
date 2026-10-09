/**
 * Unit tests for risk-rules.ts detection (pure function — no DB/network needed)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectAnomaly, type RecentTx, type RiskThresholds } from "../services/risk-rules";

const NOW = 1_800_000_000;
const THRESHOLDS: RiskThresholds = {
  windowSecs: 600,
  maxTxInWindow: 30,
  maxCounterpartiesInWindow: 15,
  minTxForFailureRate: 10,
  maxFailureRate: 0.6,
};

function txs(count: number, opts: Partial<RecentTx> & { distinct?: boolean; ageSecs?: number } = {}): RecentTx[] {
  return Array.from({ length: count }, (_, i) => ({
    success: opts.success ?? true,
    counterparty: opts.distinct ? `cp${i}` : opts.counterparty ?? "shop",
    timestamp: NOW - (opts.ageSecs ?? 60),
  }));
}

describe("detectAnomaly", () => {
  it("passes normal activity", () => {
    const verdict = detectAnomaly(txs(8), NOW, THRESHOLDS);
    assert.equal(verdict.anomalous, false);
    assert.deepEqual(verdict.reasons, []);
    assert.equal(verdict.txInWindow, 8);
  });

  it("passes an agent with no transactions", () => {
    const verdict = detectAnomaly([], NOW, THRESHOLDS);
    assert.equal(verdict.anomalous, false);
    assert.equal(verdict.failureRate, 0);
  });

  it("flags a transaction burst at the threshold", () => {
    assert.equal(detectAnomaly(txs(29), NOW, THRESHOLDS).anomalous, false);
    assert.deepEqual(detectAnomaly(txs(30), NOW, THRESHOLDS).reasons, ["tx_burst"]);
  });

  it("flags payments sprayed across many new counterparties", () => {
    assert.equal(detectAnomaly(txs(14, { distinct: true }), NOW, THRESHOLDS).anomalous, false);
    assert.deepEqual(
      detectAnomaly(txs(15, { distinct: true }), NOW, THRESHOLDS).reasons,
      ["counterparty_spray"]
    );
  });

  it("flags a failure spike only once there are enough transactions", () => {
    const fewFailures = txs(9, { success: false });
    assert.equal(detectAnomaly(fewFailures, NOW, THRESHOLDS).anomalous, false);

    const spike = [...txs(6, { success: false }), ...txs(4)];
    const verdict = detectAnomaly(spike, NOW, THRESHOLDS);
    assert.deepEqual(verdict.reasons, ["failure_spike"]);
    assert.equal(verdict.failureRate, 0.6);

    const belowRate = [...txs(5, { success: false }), ...txs(5)];
    assert.equal(detectAnomaly(belowRate, NOW, THRESHOLDS).anomalous, false);
  });

  it("ignores transactions outside the window", () => {
    const old = txs(50, { ageSecs: 601 });
    const verdict = detectAnomaly(old, NOW, THRESHOLDS);
    assert.equal(verdict.anomalous, false);
    assert.equal(verdict.txInWindow, 0);
  });

  it("reports every reason that applies", () => {
    const verdict = detectAnomaly(txs(30, { distinct: true, success: false }), NOW, THRESHOLDS);
    assert.deepEqual(verdict.reasons, ["tx_burst", "counterparty_spray", "failure_spike"]);
  });
});
