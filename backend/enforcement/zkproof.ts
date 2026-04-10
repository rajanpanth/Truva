import { EnforcementCheck, TransactionRequest } from '@/backend/types/enforcement';

export async function checkZKProof(request: TransactionRequest): Promise<EnforcementCheck> {
  const start = Date.now();

  if (!request.work_proof) {
    return {
      name: 'ZKProof',
      passed: true,
      latency_ms: Date.now() - start,
      reason: 'No work proof provided — ZK verification skipped',
    };
  }

  const isValidFormat =
    typeof request.work_proof === 'string' &&
    request.work_proof.startsWith('zkp_') &&
    request.work_proof.length > 4;

  return {
    name: 'ZKProof',
    passed: isValidFormat,
    latency_ms: Date.now() - start,
    reason: isValidFormat
      ? undefined
      : 'Invalid ZK proof format. Must be a non-empty string starting with "zkp_"',
  };
}
