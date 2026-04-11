import { EnforcementCheck, TransactionRequest } from '@/backend/types/enforcement';

export async function checkWorkPay(request: TransactionRequest): Promise<EnforcementCheck> {
  const start = Date.now();

  const isPaymentWithTask = request.task_id && request.tx_type === 'payment';

  if (!isPaymentWithTask) {
    return {
      name: 'WorkPay',
      passed: true,
      latency_ms: Date.now() - start,
    };
  }

  const hasWorkProof = !!request.work_proof && request.work_proof.length > 0;

  return {
    name: 'WorkPay',
    passed: hasWorkProof,
    latency_ms: Date.now() - start,
    reason: hasWorkProof
      ? undefined
      : 'Payment for task requires a work proof. No work_proof provided.',
  };
}
