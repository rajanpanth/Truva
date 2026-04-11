import { EnforcementCheck, TransactionRequest } from '@/backend/types/enforcement';
import { Agent } from '@/backend/types/agent';
import { createServerClient } from '@/backend/supabase/server';

export async function checkOnChainGate(
  agent: Agent,
  request: TransactionRequest,
  sessionId: string,
  checks?: Record<string, EnforcementCheck>
): Promise<EnforcementCheck> {
  const start = Date.now();

  try {
    const supabase = createServerClient();

    const allPassed = checks
      ? Object.values(checks).every((c) => c.passed)
      : true;

    const status = allPassed ? 'passed' : 'blocked';
    const blockReason = allPassed
      ? null
      : Object.values(checks ?? {})
          .filter((c) => !c.passed)
          .map((c) => `${c.name}: ${c.reason}`)
          .join('; ');

    await supabase.from('trustgate_logs').insert({
      agent_id: agent.id,
      agent_name: agent.name,
      session_id: sessionId,
      action: request.tx_type,
      status,
      latency_ms: Date.now() - start,
      block_reason: blockReason,
      check_results: (checks ?? {}) as Record<string, unknown>,
      amount: request.amount,
      token: request.token,
    });

    return {
      name: 'OnChainGate',
      passed: true,
      latency_ms: Date.now() - start,
    };
  } catch (error) {
    console.error('OnChainGate logging error:', error);
    return {
      name: 'OnChainGate',
      passed: true,
      latency_ms: Date.now() - start,
      reason: 'Gate logging failed but transaction not blocked',
    };
  }
}
