'use client';

import { useState, useMemo } from 'react';
import { TruvaStatusPill, TruvaButton, TruvaStatCard, TruvaPulsingDot } from '@/components/ui/truva';
import { Shield, Search, Download, Activity, Clock, ShieldCheck, Filter } from 'lucide-react';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import type { TrustGateLog } from '@/backend/types/trustgate';

function LatencyChip({ ms }: { ms: number | null | undefined }) {
  if (ms == null) return <span className="text-[var(--text-muted)]">—</span>;
  const color = ms < 20 ? '#00e87a' : ms < 50 ? '#f59e0b' : '#f03636';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tabular-nums"
      style={{ color, background: `${color}18`, border: `1px solid ${color}44` }}
    >
      {ms}ms
    </span>
  );
}

export default function TrustGateLogsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useTrustGateLogs({ limit: 50 });
  const logs: TrustGateLog[] = data?.data ?? [];

  const filtered = useMemo(() => logs.filter((l: TrustGateLog) => {
    if (filter === 'PASSED' && l.status !== 'passed') return false;
    if (filter === 'BLOCKED' && l.status !== 'blocked') return false;
    const q = search.toLowerCase();
    if (q && !l.agent_name?.toLowerCase().includes(q) && !l.agent_id?.toLowerCase().includes(q)) return false;
    return true;
  }), [logs, filter, search]);

  const passedCount = logs.filter((l: TrustGateLog) => l.status === 'passed').length;
  const blockedCount = logs.filter((l: TrustGateLog) => l.status === 'blocked').length;
  const avgLatency = logs.length > 0
    ? Math.round(logs.reduce((s: number, l: TrustGateLog) => s + (l.latency_ms ?? 0), 0) / logs.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(0,232,122,0.15),rgba(0,232,122,0.05))', border: '1px solid rgba(0,232,122,0.2)' }}>
              <Activity size={16} className="text-[var(--accent-green)]" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">TrustGate Logs</h1>
            <TruvaStatusPill variant="live" />
          </div>
          <p className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)] ml-11">
            Real-time verification stream · {logs.length} entries in buffer
          </p>
        </div>
        <TruvaButton
          variant="outlined"
          className="text-[11px] gap-2 self-start sm:self-auto"
          onClick={() => {
            const header = 'Timestamp,Agent,Action,Block Reason,Latency (ms),Status';
            const rows = filtered.map((l: TrustGateLog) =>
              [
                new Date(l.created_at).toISOString(),
                l.agent_name ?? l.agent_id ?? '',
                l.action ?? '',
                l.block_reason ?? '',
                l.latency_ms ?? '',
                l.status,
              ]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(',')
            );
            const csv = [header, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trustgate-logs-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={12} /> Export CSV
        </TruvaButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TruvaStatCard
          label="TOTAL VERIFIED"
          value={isLoading ? '—' : String(logs.length)}
          sub="In buffer"
          icon={<ShieldCheck size={15} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="PASS RATE"
          value={isLoading || !logs.length ? '—' : `${((passedCount / logs.length) * 100).toFixed(1)}%`}
          sub={`${passedCount} passed`}
          icon={<Shield size={15} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="BLOCKED"
          value={isLoading ? '—' : String(blockedCount)}
          sub="Violations detected"
          valueColor="var(--red)"
          icon={<Activity size={15} className="text-[var(--red)]" />}
        />
        <TruvaStatCard
          label="AVG LATENCY"
          value={isLoading ? '—' : `${avgLatency}ms`}
          sub="Across all checks"
          icon={<Clock size={15} className="text-[var(--accent-green)]" />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[340px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            placeholder="Search agent or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[12px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] transition-all focus:outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', outline: 'none' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <Filter size={12} className="text-[var(--text-muted)] mx-2" />
          {['ALL', 'PASSED', 'BLOCKED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-[2px] rounded-md font-medium transition-all duration-200 ${
                filter === f
                  ? f === 'BLOCKED'
                    ? 'text-[var(--red)] bg-[var(--red-dim)]'
                    : 'text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
                <th className="w-10" />
                {['Timestamp', 'Agent', 'Action', 'Block Reason', 'Latency', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[3px] text-[var(--text-muted)] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={7} className="px-4 py-3.5">
                        <div className="h-4 rounded-md animate-pulse" style={{ background: 'var(--bg-elevated)', width: `${60 + (i % 3) * 12}%` }} />
                      </td>
                    </tr>
                  ))
                : filtered.slice(0, 50).map((l: TrustGateLog, i: number) => (
                    <tr
                      key={l.id ?? i}
                      className="group transition-colors duration-150"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="pl-4 py-3">
                        {i === 0 ? (
                          <TruvaPulsingDot size={6} />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ background: l.status === 'passed' ? 'rgba(0,232,122,0.3)' : 'rgba(240,54,54,0.3)' }} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)] tabular-nums font-mono">
                        {new Date(l.created_at).toISOString().substring(11, 19)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-green)' }}>
                          {l.agent_name ?? l.agent_id?.slice(0, 10)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)] font-mono">
                        {l.action}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">
                        {l.block_reason ?? <span className="text-[var(--text-dim)]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <LatencyChip ms={l.latency_ms} />
                      </td>
                      <td className="px-4 py-3">
                        <TruvaStatusPill variant={l.status} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <span className="text-[11px] uppercase tracking-[2px] text-[var(--text-muted)]">
            Showing <span className="text-[var(--text-secondary)]">{Math.min(50, filtered.length)}</span> of <span className="text-[var(--text-secondary)]">{filtered.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <TruvaPulsingDot size={4} />
            <span className="text-[11px] uppercase tracking-[2px] text-[var(--accent-green)]">Auto-refresh · 5s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
