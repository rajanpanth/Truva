import { EnforcementResult, TransactionRequest } from '@/backend/types/enforcement';
import { Agent } from '@/backend/types/agent';
import { checkTrustGate } from './trustgate';
import { checkTxAuth } from './txauth';
import { checkReputaScore } from './reputascore';
import { checkWorkPay } from './workpay';
import { checkOnChainGate } from './onchaingat';
import { checkRiskGuard } from './riskguard';
import { checkZKProof } from './zkproof';
import { checkAgentStandard } from './agentstandard';
import { checkChainPort } from './chainport';
import { runFastEnforce } from './fastenforce';

export async function runEnforcementEngine(
  request: TransactionRequest,
  agent: Agent
): Promise<EnforcementResult> {
  const sessionId = crypto.randomUUID();
  const startTime = Date.now();

  const result = await runFastEnforce({
    request,
    agent,
    sessionId,
    checks: [
      () => checkTrustGate(agent, request),
      () => checkTxAuth(agent, request),
      () => checkReputaScore(agent),
      () => checkWorkPay(request),
      () => checkOnChainGate(agent, request, sessionId, {}),
      () => checkRiskGuard(agent, request),
      () => checkZKProof(request),
      () => checkAgentStandard(agent, request),
      () => checkChainPort(agent, request),
    ],
  });

  const totalLatency = Date.now() - startTime;

  return {
    ...result,
    total_latency_ms: totalLatency,
    session_id: sessionId,
  };
}
