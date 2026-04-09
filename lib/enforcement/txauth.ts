import { EnforcementCheck, TransactionRequest } from '@/types/enforcement';
import { Agent } from '@/types/agent';

const DEFAULT_PERMITTED_ACTIONS: Record<string, string[]> = {
  trading: ['swap', 'transfer', 'stake'],
  yield: ['stake', 'transfer', 'payment'],
  data: ['transfer', 'payment'],
  execution: ['swap', 'transfer', 'payment', 'stake'],
  risk: ['transfer', 'payment'],
  treasury: ['swap', 'transfer', 'payment', 'stake'],
  monitoring: ['transfer'],
  payment: ['transfer', 'payment'],
};

export async function checkTxAuth(
  agent: Agent,
  request: TransactionRequest
): Promise<EnforcementCheck> {
  const start = Date.now();

  const permittedActions =
    (agent.metadata?.permitted_actions as string[] | undefined) ??
    DEFAULT_PERMITTED_ACTIONS[agent.task_type] ??
    [];

  const passed = permittedActions.includes(request.tx_type);

  return {
    name: 'TxAuth',
    passed,
    latency_ms: Date.now() - start,
    reason: passed
      ? undefined
      : `Transaction type "${request.tx_type}" not permitted for agent task type "${agent.task_type}". Allowed: ${permittedActions.join(', ')}`,
  };
}
