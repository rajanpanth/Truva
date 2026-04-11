import { useMutation } from '@tanstack/react-query';
import { EnforcementResult, TransactionRequest } from '@/backend/types/enforcement';

async function enforceTransaction(request: TransactionRequest): Promise<EnforcementResult> {
  const res = await fetch('/api/transactions/enforce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Enforcement failed');
  }
  return res.json();
}

export function useEnforcement() {
  return useMutation({
    mutationFn: enforceTransaction,
  });
}
