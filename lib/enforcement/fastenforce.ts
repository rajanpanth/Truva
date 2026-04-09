import { EnforcementCheck, EnforcementResult, TransactionRequest } from '@/types/enforcement';
import { Agent } from '@/types/agent';

interface FastEnforceInput {
  request: TransactionRequest;
  agent: Agent;
  sessionId: string;
  checks: Array<() => Promise<EnforcementCheck>>;
}

export async function runFastEnforce(input: FastEnforceInput): Promise<EnforcementResult> {
  const { checks, sessionId } = input;

  const parallelChecks = [
    checks[0], // TrustGate
    checks[1], // TxAuth
    checks[2], // ReputaScore
    checks[5], // RiskGuard
    checks[6], // ZKProof
    checks[7], // AgentStandard
    checks[8], // ChainPort
  ];

  const parallelResults = await Promise.all(parallelChecks.map((fn) => fn()));

  const checksMap: Record<string, EnforcementCheck> = {};
  for (const result of parallelResults) {
    checksMap[result.name] = result;
  }

  // Sequential: WorkPay
  const workPayResult = await checks[3]();
  checksMap[workPayResult.name] = workPayResult;

  // Sequential: OnChainGate (needs all previous results for logging)
  const onChainGateCheck = checks[4];
  // The onchaingat check function signature expects extra args injected via closure
  const onChainResult = await onChainGateCheck();
  checksMap[onChainResult.name] = onChainResult;

  const allPassed = Object.values(checksMap).every((c) => c.passed);
  const failedChecks = Object.values(checksMap).filter((c) => !c.passed);
  const blockReason = failedChecks.length > 0
    ? failedChecks.map((c) => `${c.name}: ${c.reason}`).join('; ')
    : undefined;

  // Add FastEnforce meta-check
  checksMap['FastEnforce'] = {
    name: 'FastEnforce',
    passed: true,
    latency_ms: 0,
    reason: `Orchestrated ${Object.keys(checksMap).length} checks (${parallelResults.length} parallel, 2 sequential)`,
  };

  return {
    allowed: allPassed,
    total_latency_ms: 0,
    session_id: sessionId,
    checks: checksMap,
    block_reason: blockReason,
    zk_proof: allPassed ? `zkp_verified_${sessionId.slice(0, 8)}` : undefined,
  };
}
