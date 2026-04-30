'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TruvaStatCard, TruvaStatusPill, TruvaButton } from '@/components/ui/truva';
import { ShieldCheck, Zap, Users, TrendingUp, Shield } from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import { useStats } from '@/lib/hooks/useStats';
import { TIER_LABELS } from '@/backend/types/agent';
import type { Agent } from '@/backend/types/agent';
import type { TrustGateLog } from '@/backend/types/trustgate';

const tierColors: Record<string, string> = {
  platinum: 'var(--tier-platinum)',
  gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)',
  bronze: 'var(--tier-bronze)',
};

export default function DashboardPage() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().substring(11, 19));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  const { data: agents = [] } = useAgents({});
  const { data: logsData } = useTrustGateLogs({ limit: 8 });
  const { data: stats } = useStats();
  const logs: TrustGateLog[] = logsData?.data ?? [];
  const activeAgents = agents.filter((a: Agent) => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TruvaStatCard label="ACTIVE_AGENTS" value={String(activeAgents.length || stats?.agentCount || '—')} sub="REGISTERED" icon={<Users size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TX_VALIDATED" value={stats?.transactionCount ? stats.transactionCount.toLocaleString() : '—'} sub="TOTAL" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="AVG_LATENCY" value={stats?.avgLatency ? `${Math.round(stats.avgLatency)}ms` : '—'} sub="P99: ALL TIME" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TRUST_INDEX" value={agents.length ? (agents.reduce((s: number, a: Agent) => s + a.trust_score, 0) / agents.length).toFixed(1) : '—'} sub="AVG SCORE" icon={<TrendingUp size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Connected Agents */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] uppercase tracking-[2px] font-bold">CONNECTED_AGENTS</h3>
            <Link href="/registry"><TruvaButton variant="ghost" className="text-[12px] px-3 py-1">VIEW_ALL</TruvaButton></Link>
          </div>
          <div className="space-y-3">
            {agents.slice(0, 4).map((a: Agent) => {
              const tl = TIER_LABELS[a.tier]?.toLowerCase() ?? 'bronze';
              const tc = tierColors[tl] ?? tierColors.bronze;
              const agentStatus = a.is_flagged ? 'flagged' : a.is_active ? 'active' : 'inactive';
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px]">
                  <div className="w-8 h-8 bg-[var(--border-default)] rounded-[2px] flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold">{a.name}</span>
                      <TruvaStatusPill variant={tl as 'gold' | 'silver' | 'bronze'} />
                    </div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-0.5 font-mono">{a.public_key.slice(0, 6)}…{a.public_key.slice(-4)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[12px] font-bold tabular-nums" style={{ color: tc }}>{a.trust_score}%</div>
                    <TruvaStatusPill variant={agentStatus as 'active' | 'inactive' | 'flagged'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TrustGate Logs */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] uppercase tracking-[2px] font-bold">TRUSTGATE_LOGS</h3>
              <TruvaStatusPill variant="live" />
            </div>
            <span className="text-[12px] text-[var(--text-muted)]">{now} UTC</span>
          </div>
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
            {logs.map((l: TrustGateLog, i: number) => (
              <div key={l.id ?? i} className="flex items-center gap-2 px-2 py-1.5 text-[13px] hover:bg-[var(--bg-elevated)] rounded-[2px]">
                <span className="text-[var(--text-muted)] w-[54px] shrink-0">
                  {new Date(l.created_at).toISOString().substring(11, 19)}
                </span>
                <span className="text-[var(--accent-green)] w-[80px] shrink-0 truncate">{l.agent_name ?? l.agent_id?.slice(0, 10)}</span>
                <span className="text-[var(--text-secondary)] flex-1 truncate">{l.action}</span>
                <TruvaStatusPill variant={l.status as 'passed' | 'blocked'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
