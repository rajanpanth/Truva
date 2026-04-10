'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/backend/supabase/client';
import { Bot, ArrowUpDown, Shield, Activity } from 'lucide-react';

interface Stat {
  label: string;
  value: string;
  icon: React.ElementType;
  sub: string;
}

export function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const supabase = createBrowserClient();
      const [agentsRes, txRes, logsRes, blockedRes] = await Promise.all([
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        supabase.from('trustgate_logs').select('id', { count: 'exact', head: true }),
        supabase.from('trustgate_logs').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
      ]);

      const totalAgents = agentsRes.count ?? 0;
      const totalTx = txRes.count ?? 0;
      const totalLogs = logsRes.count ?? 0;
      const blockedCount = blockedRes.count ?? 0;
      const blockRate = totalLogs > 0 ? ((blockedCount / totalLogs) * 100).toFixed(1) : '0';

      return [
        { label: 'ACTIVE_AGENTS', value: totalAgents.toString(), icon: Bot, sub: 'REGISTERED_ENTITIES' },
        { label: 'TOTAL_TX', value: totalTx.toString(), icon: ArrowUpDown, sub: 'PROCESSED_PAYMENTS' },
        { label: 'GATE_CHECKS', value: totalLogs.toString(), icon: Shield, sub: 'ENFORCEMENT_RUNS' },
        { label: 'BLOCK_RATE', value: `${blockRate}%`, icon: Activity, sub: 'THREAT_REJECTION' },
      ] satisfies Stat[];
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded border border-[#1a1a1a] bg-[#0d0d0d]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats?.map((stat) => (
        <div key={stat.label} className="rounded border border-[#1a1a1a] bg-[#0d0d0d] p-5">
          <div className="mb-2 flex items-center gap-2">
            <stat.icon className="h-3.5 w-3.5 text-[#00ff88]" />
            <span className="font-mono text-[10px] tracking-widest text-[#555]">{stat.label}</span>
          </div>
          <p className="font-mono text-2xl font-bold text-white">{stat.value}</p>
          <p className="mt-1 font-mono text-[10px] text-[#444]">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}
