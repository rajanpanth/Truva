'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TruvaStatCard, TruvaStatusPill, TruvaButton, TruvaPulsingDot } from '@/components/ui/truva';
import { ShieldCheck, Zap, Users, TrendingUp, Shield, Activity, ArrowRight } from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import { useStats } from '@/lib/hooks/useStats';
import { TIER_LABELS } from '@/backend/types/agent';
import type { Agent } from '@/backend/types/agent';
import type { TrustGateLog } from '@/backend/types/trustgate';

const tierColors: Record<string, string> = {
  Gold: 'var(--tier-gold)',
  Silver: 'var(--tier-silver)', Bronze: 'var(--tier-bronze)',
};

const payments = [
  { date: '2026-04-29', desc: 'Validator Reward · Epoch 412', amount: '+2,450 SOL', status: 'passed' as const },
  { date: '2026-04-28', desc: 'Agent Registration Fee', amount: '-500 SOL', status: 'passed' as const },
  { date: '2026-04-27', desc: 'Slashing Penalty · Oracle Eye', amount: '-120 SOL', status: 'blocked' as const },
];

export default function PlatformDashboard() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().substring(11, 19));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  const { data: agents = [], isLoading: agentsLoading } = useAgents({ isActive: true });
  const { data: logsData, isLoading: logsLoading } = useTrustGateLogs({ limit: 20 });
  const { data: stats } = useStats();

  const logs = logsData?.data ?? [];
  const activeCount = agents.length;
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((s: number, l: TrustGateLog) => s + (l.latency_ms ?? 0), 0) / logs.length)
    : 0;
  const avgTrust = agents.length > 0
    ? (agents.reduce((s: number, a: Agent) => s + a.trust_score, 0) / agents.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Dashboard</h1>
          <p className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)] mt-1">Platform overview · Epoch 412</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)]"
            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
            <TruvaPulsingDot size={4} />
            <span className="text-[var(--accent-green)]">LIVE</span>
            <span>{now} UTC</span>
          </div>
          <Link href="/register">
            <TruvaButton variant="outlined" className="text-[11px] gap-1.5 py-1.5">
              <Zap size={12} /> Deploy Agent
            </TruvaButton>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TruvaStatCard label="ACTIVE AGENTS" value={agentsLoading ? '—' : String(activeCount)} sub="Registered & active" icon={<Users size={15} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TX VALIDATED" value={stats ? String(stats.transactionCount) : '—'} sub="Total transactions" icon={<ShieldCheck size={15} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="AVG LATENCY" value={logsLoading ? '—' : `${avgLatency}ms`} sub="From last 20 checks" icon={<Zap size={15} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TRUST INDEX" value={agentsLoading ? '—' : avgTrust} sub="Avg across agents" icon={<TrendingUp size={15} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Connected Agents */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)' }}>
                <Shield size={14} className="text-[var(--accent-green)]" />
              </div>
              <h3 className="text-[13px] uppercase tracking-[2px] font-bold">Connected Agents</h3>
            </div>
            <Link href="/registry">
              <button className="flex items-center gap-1 text-[11px] uppercase tracking-[2px] text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors">
                View all <ArrowRight size={11} />
              </button>
            </Link>
          </div>
          <div className="p-4 space-y-2">
            {agentsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
              ))
              : agents.slice(0, 6).map((a: Agent) => {
                const tierName = TIER_LABELS[a.tier];
                const initials = a.name.split(/[\s_]/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Link key={a.id} href={`/agent/${a.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer"
                      style={{ border: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.border = '1px solid var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.border = '1px solid var(--border-subtle)'; e.currentTarget.style.background = 'transparent'; }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
                        style={{ background: 'rgba(0,232,122,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(0,232,122,0.2)' }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{a.name}</span>
                          <TruvaStatusPill variant={tierName.toLowerCase() as 'gold' | 'silver' | 'bronze'} />
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">{a.public_key.slice(0, 10)}…{a.public_key.slice(-4)}</div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className="text-[13px] font-bold tabular-nums" style={{ color: tierColors[tierName] }}>{a.trust_score}%</div>
                        <TruvaStatusPill variant={a.is_active ? 'active' : 'inactive'} />
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* TrustGate Logs */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)' }}>
                <Activity size={14} className="text-[var(--accent-green)]" />
              </div>
              <h3 className="text-[13px] uppercase tracking-[2px] font-bold">TrustGate Logs</h3>
            </div>
            <TruvaStatusPill variant="live" />
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
            {logsLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 mx-4 my-1.5 rounded-md animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
              ))
              : logs.map((l: TrustGateLog, i: number) => (
                <div key={l.id ?? i} className="flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-mono transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span className="text-[var(--text-muted)] w-[52px] shrink-0 tabular-nums">{new Date(l.created_at).toISOString().substring(11, 19)}</span>
                  <span className="text-[var(--accent-green)] w-[80px] shrink-0 truncate font-semibold">{l.agent_name ?? l.agent_id?.slice(0, 8)}</span>
                  <span className="text-[var(--text-secondary)] flex-1 truncate">{l.action}</span>
                  <TruvaStatusPill variant={l.status} />
                </div>
              ))}
          </div>
          <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <TruvaPulsingDot size={4} />
            <span className="text-[10px] uppercase tracking-[2px] text-[var(--text-muted)]">Auto-refresh · <span className="text-[var(--accent-green)]">{logs.length} entries</span></span>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold">Payment Settlement History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                {['Date', 'Description', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-[3px] text-[var(--text-muted)] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-5 py-3.5 text-[12px] text-[var(--text-muted)] font-mono tabular-nums">{p.date}</td>
                  <td className="px-5 py-3.5 text-[12px] text-[var(--text-secondary)]">{p.desc}</td>
                  <td className={`px-5 py-3.5 text-[13px] font-bold tabular-nums ${p.amount.startsWith('+') ? 'text-[var(--accent-green)]' : 'text-[var(--red)]'}`}>{p.amount}</td>
                  <td className="px-5 py-3.5"><TruvaStatusPill variant={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
