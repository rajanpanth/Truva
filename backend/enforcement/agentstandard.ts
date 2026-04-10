import { EnforcementCheck, TransactionRequest } from '@/backend/types/enforcement';
import { Agent } from '@/backend/types/agent';
import { createServerClient } from '@/backend/supabase/server';

export async function checkAgentStandard(
  agent: Agent,
  request: TransactionRequest
): Promise<EnforcementCheck> {
  const start = Date.now();

  if (!agent.is_active) {
    return {
      name: 'AgentStandard',
      passed: false,
      latency_ms: Date.now() - start,
      reason: 'Agent is not active',
    };
  }

  if (request.recipient && request.task_id) {
    try {
      const supabase = createServerClient();
      const { data: recipientAgent } = await supabase
        .from('agents')
        .select('id, is_active, name')
        .eq('public_key', request.recipient)
        .single();

      if (!recipientAgent) {
        return {
          name: 'AgentStandard',
          passed: false,
          latency_ms: Date.now() - start,
          reason: 'Recipient agent not found in registry',
        };
      }

      if (!recipientAgent.is_active) {
        return {
          name: 'AgentStandard',
          passed: false,
          latency_ms: Date.now() - start,
          reason: `Recipient agent "${recipientAgent.name}" is not active`,
        };
      }
    } catch (error) {
      console.error('AgentStandard recipient check error:', error);
    }
  }

  return {
    name: 'AgentStandard',
    passed: true,
    latency_ms: Date.now() - start,
  };
}
