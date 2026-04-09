import { EnforcementCheck, TransactionRequest } from '@/types/enforcement';
import { Agent } from '@/types/agent';
import { createServerClient } from '@/lib/supabase/server';

export async function checkRiskGuard(
  agent: Agent,
  request: TransactionRequest
): Promise<EnforcementCheck> {
  const start = Date.now();

  if (request.amount > agent.max_tx_size) {
    return {
      name: 'RiskGuard',
      passed: false,
      latency_ms: Date.now() - start,
      reason: `Transaction amount ${request.amount} exceeds max allowed ${agent.max_tx_size}`,
    };
  }

  try {
    const supabase = createServerClient();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .gte('created_at', oneHourAgo);

    const txCount = count ?? 0;

    if (txCount >= agent.rate_limit) {
      return {
        name: 'RiskGuard',
        passed: false,
        latency_ms: Date.now() - start,
        reason: `Agent exceeded rate limit: ${txCount}/${agent.rate_limit} transactions in the last hour`,
      };
    }
  } catch (error) {
    console.error('RiskGuard rate limit check error:', error);
  }

  return {
    name: 'RiskGuard',
    passed: true,
    latency_ms: Date.now() - start,
  };
}
