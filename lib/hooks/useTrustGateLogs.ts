import { useQuery } from '@tanstack/react-query';
import { TrustGateLog } from '@/backend/types/trustgate';

interface UseTrustGateLogsOptions {
  limit?: number;
  offset?: number;
  page?: number;
  status?: 'passed' | 'blocked';
  decision?: string;
  agentId?: string;
}

async function fetchTrustGateLogs(options: UseTrustGateLogsOptions): Promise<{ data: TrustGateLog[]; total: number }> {
  const params = new URLSearchParams();
  const limit = options.limit ?? 20;
  if (options.limit) params.set('limit', String(limit));
  const offset = options.offset ?? (options.page != null ? options.page * limit : undefined);
  if (offset != null) params.set('offset', String(offset));
  const status = options.status ?? (options.decision as 'passed' | 'blocked' | undefined);
  if (status) params.set('status', status);
  if (options.agentId) params.set('agent_id', options.agentId);

  const res = await fetch(`/api/trustgate?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch TrustGate logs');
  return res.json();
}

export function useTrustGateLogs(options: UseTrustGateLogsOptions = {}) {
  return useQuery({
    queryKey: ['trustgate-logs', options],
    queryFn: () => fetchTrustGateLogs(options),
    refetchInterval: 5_000,
  });
}
