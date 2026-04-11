import { NextRequest, NextResponse } from 'next/server';
import { runEnforcementEngine } from '@/backend/enforcement/engine';
import type { Agent } from '@/backend/types/agent';
import type { TransactionRequest, EnforcementCheck } from '@/backend/types/enforcement';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const rogueAgent: Agent = {
      id: crypto.randomUUID(),
      name: 'ROGUE_AGENT_X',
      public_key: 'RogueXXX9999ZZZAttackVector00000000000000000',
      operator_name: 'Unknown Operator',
      operator_email: 'rogue@malicious.invalid',
      description: 'Simulated rogue agent for demo purposes',
      task_type: 'trading',
      trust_score: 12,
      tier: 1,
      status: 'flagged',
      max_tx_size: 100,
      rate_limit: 5,
      success_rate: 0,
      is_active: true,
      is_flagged: true,
      flagged: true,
      chains: ['solana'],
      pda: undefined,
      metadata: { simulated: true, attack_type: 'oversized_swap' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const badRequest: TransactionRequest = {
      agent_id: rogueAgent.id,
      tx_type: 'swap',
      amount: 999999,
      token: 'SOL',
      chain: 'solana',
    };

    const result = await runEnforcementEngine(badRequest, rogueAgent);

    const phases: string[] = [];
    phases.push('Phase 1: Rogue agent created in memory with trust_score=12, tier=1, max_tx_size=100');
    phases.push(`Phase 2: Malicious request crafted — swap 999,999 SOL (max allowed: ${rogueAgent.max_tx_size})`);
    phases.push(`Phase 3: Enforcement engine executed ${Object.keys(result.checks).length} checks in ${result.total_latency_ms}ms`);

    const failedChecks = Object.entries(result.checks)
      .filter(([, check]: [string, EnforcementCheck]) => !check.passed)
      .map(([name, check]: [string, EnforcementCheck]) => `${name}: ${check.reason ?? 'failed'}`);

    const passedChecks = Object.entries(result.checks)
      .filter(([, check]: [string, EnforcementCheck]) => check.passed)
      .map(([name]: [string, EnforcementCheck]) => name);

    if (failedChecks.length > 0) {
      phases.push(`Phase 4: BLOCKED — ${failedChecks.length} check(s) failed: ${failedChecks.join('; ')}`);
    }
    if (passedChecks.length > 0) {
      phases.push(`Phase 5: ${passedChecks.length} check(s) passed: ${passedChecks.join(', ')}`);
    }
    phases.push(`Phase 6: Final verdict — ${result.allowed ? 'ALLOWED' : 'BLOCKED'}${result.block_reason ? ` (${result.block_reason})` : ''}`);

    return NextResponse.json({
      rogue_agent: rogueAgent,
      request: badRequest,
      result,
      phases,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
