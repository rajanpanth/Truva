import { describe, it, expect } from 'vitest';
import { checkTrustGate } from '../app/backend/enforcement/trustgate';
import { runFastEnforce } from '../app/backend/enforcement/fastenforce';
import type { Agent } from '../app/backend/types/agent';
import type { TransactionRequest, EnforcementCheck } from '../app/backend/types/enforcement';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'test-agent-1',
    name: 'TEST_AGENT',
    public_key: '0xTEST',
    operator_name: 'Test Operator',
    operator_email: 'test@test.com',
    task_type: 'trading',
    trust_score: 75,
    tier: 2,
    status: 'active',
    max_tx_size: 100000,
    rate_limit: 100,
    success_rate: 0.95,
    is_active: true,
    is_flagged: false,
    flagged: false,
    chains: ['solana'],
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRequest(overrides: Partial<TransactionRequest> = {}): TransactionRequest {
  return {
    agent_id: 'test-agent-1',
    tx_type: 'payment',
    amount: 500,
    token: 'SOL',
    chain: 'solana',
    ...overrides,
  };
}

// ---------- TrustGate Check ----------

describe('checkTrustGate', () => {
  it('passes for tier 1 agent with small amount', async () => {
    const agent = makeAgent({ tier: 1 });
    const request = makeRequest({ amount: 500 });
    const result = await checkTrustGate(agent, request);
    expect(result.passed).toBe(true);
    expect(result.name).toBe('TrustGate');
  });

  it('fails for tier 1 agent with large amount (>1000)', async () => {
    const agent = makeAgent({ tier: 1 });
    const request = makeRequest({ amount: 5000 });
    const result = await checkTrustGate(agent, request);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('insufficient');
  });

  it('passes for tier 2 agent with medium amount', async () => {
    const agent = makeAgent({ tier: 2 });
    const request = makeRequest({ amount: 5000 });
    const result = await checkTrustGate(agent, request);
    expect(result.passed).toBe(true);
  });

  it('fails for tier 2 agent with amount > 10000', async () => {
    const agent = makeAgent({ tier: 2 });
    const request = makeRequest({ amount: 50000 });
    const result = await checkTrustGate(agent, request);
    expect(result.passed).toBe(false);
  });

  it('passes for tier 3 (Gold) agent with any amount', async () => {
    const agent = makeAgent({ tier: 3 });
    const request = makeRequest({ amount: 999999 });
    const result = await checkTrustGate(agent, request);
    expect(result.passed).toBe(true);
  });

  it('includes latency_ms in result', async () => {
    const result = await checkTrustGate(makeAgent(), makeRequest());
    expect(typeof result.latency_ms).toBe('number');
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });
});

// ---------- FastEnforce Orchestrator ----------

describe('runFastEnforce', () => {
  function mockCheck(name: string, passed = true): () => Promise<EnforcementCheck> {
    return async () => ({
      name,
      passed,
      latency_ms: 1,
      reason: passed ? undefined : `${name} failed`,
    });
  }

  it('returns allowed=true when all checks pass', async () => {
    const result = await runFastEnforce({
      request: makeRequest(),
      agent: makeAgent(),
      sessionId: 'test-session-1',
      checks: [
        mockCheck('TrustGate'),
        mockCheck('TxAuth'),
        mockCheck('ReputaScore'),
        mockCheck('WorkPay'),
        mockCheck('OnChainGate'),
        mockCheck('RiskGuard'),
        mockCheck('ZKProof'),
        mockCheck('AgentStandard'),
        mockCheck('ChainPort'),
      ],
    });

    expect(result.allowed).toBe(true);
    expect(result.block_reason).toBeUndefined();
    expect(Object.keys(result.checks)).toHaveLength(10); // 9 checks + FastEnforce meta
  });

  it('returns allowed=false when a check fails', async () => {
    const result = await runFastEnforce({
      request: makeRequest(),
      agent: makeAgent(),
      sessionId: 'test-session-2',
      checks: [
        mockCheck('TrustGate'),
        mockCheck('TxAuth'),
        mockCheck('ReputaScore', false), // FAIL
        mockCheck('WorkPay'),
        mockCheck('OnChainGate'),
        mockCheck('RiskGuard'),
        mockCheck('ZKProof'),
        mockCheck('AgentStandard'),
        mockCheck('ChainPort'),
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.block_reason).toContain('ReputaScore');
  });

  it('produces zk_proof only when all pass', async () => {
    const passResult = await runFastEnforce({
      request: makeRequest(),
      agent: makeAgent(),
      sessionId: 'sess-pass',
      checks: Array(9).fill(null).map((_, i) => mockCheck(`Check${i}`)),
    });
    expect(passResult.zk_proof).toBeDefined();

    const failResult = await runFastEnforce({
      request: makeRequest(),
      agent: makeAgent(),
      sessionId: 'sess-fail',
      checks: [
        mockCheck('A', false),
        ...Array(8).fill(null).map((_, i) => mockCheck(`B${i}`)),
      ],
    });
    expect(failResult.zk_proof).toBeUndefined();
  });

  it('includes FastEnforce meta-check', async () => {
    const result = await runFastEnforce({
      request: makeRequest(),
      agent: makeAgent(),
      sessionId: 'test-meta',
      checks: Array(9).fill(null).map((_, i) => mockCheck(`Check${i}`)),
    });
    expect(result.checks['FastEnforce']).toBeDefined();
    expect(result.checks['FastEnforce'].passed).toBe(true);
    expect(result.checks['FastEnforce'].reason).toContain('parallel');
  });
});
