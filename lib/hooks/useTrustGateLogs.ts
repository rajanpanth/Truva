import { useQuery } from '@tanstack/react-query';
import { TrustGateLog } from '@/types/trustgate';

interface UseTrustGateLogsOptions {
  limit?: number;
  offset?: number;
  status?: 'passed' | 'blocked';
  agentId?: string;
}

async function fetchTrustGateLogs(options: UseTrustGateLogsOptions): Promise<{ data: TrustGateLog[]; total: number }> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.status) params.set('status', options.status);
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
