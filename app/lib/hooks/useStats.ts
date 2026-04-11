import { useQuery } from '@tanstack/react-query';

interface PlatformStats {
  agentCount: number;
  transactionCount: number;
  gateCheckCount: number;
  avgLatency: number;
}

async function fetchStats(): Promise<PlatformStats> {
  const [agentsRes, txRes, logsRes] = await Promise.all([
    fetch('/api/agents?is_active=true'),
    fetch('/api/transactions?limit=1'),
    fetch('/api/trustgate?limit=1'),
  ]);

  const agents = agentsRes.ok ? await agentsRes.json() : { data: [] };
  const tx = txRes.ok ? await txRes.json() : { total: 0 };
  const logs = logsRes.ok ? await logsRes.json() : { total: 0, data: [] };

  const avgLatency =
    logs.data?.length > 0
      ? Math.round(
          logs.data.reduce((sum: number, l: { latency_ms?: number }) => sum + (l.latency_ms ?? 0), 0) /
            logs.data.length
        )
      : 0;

  return {
    agentCount: agents.data?.length ?? 0,
    transactionCount: tx.total ?? 0,
    gateCheckCount: logs.total ?? 0,
    avgLatency,
  };
}

export function useStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: fetchStats,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
