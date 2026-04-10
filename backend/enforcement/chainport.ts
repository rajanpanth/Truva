import { EnforcementCheck, TransactionRequest } from '@/backend/types/enforcement';
import { Agent } from '@/backend/types/agent';

export async function checkChainPort(
  agent: Agent,
  request: TransactionRequest
): Promise<EnforcementCheck> {
  const start = Date.now();

  if (agent.is_flagged) {
    return {
      name: 'ChainPort',
      passed: false,
      latency_ms: Date.now() - start,
      reason: 'Agent is flagged across chains. All transactions blocked.',
    };
  }

  const supportsChain = agent.chains.includes(request.chain as typeof agent.chains[number]);

  return {
    name: 'ChainPort',
    passed: supportsChain,
    latency_ms: Date.now() - start,
    reason: supportsChain
      ? undefined
      : `Agent does not support chain "${request.chain}". Supported: ${agent.chains.join(', ')}`,
  };
}
