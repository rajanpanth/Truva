import { EnforcementCheck, TransactionRequest } from '@/types/enforcement';
import { Agent } from '@/types/agent';

export async function checkTrustGate(
  agent: Agent,
  request: TransactionRequest
): Promise<EnforcementCheck> {
  const start = Date.now();

  const requiredTier = request.amount > 10000 ? 3 : request.amount > 1000 ? 2 : 1;
  const passed = agent.tier >= requiredTier;

  return {
    name: 'TrustGate',
    passed,
    latency_ms: Date.now() - start,
    reason: passed
      ? undefined
      : `Agent tier ${agent.tier} insufficient for transaction amount. Required tier: ${requiredTier}`,
  };
}
