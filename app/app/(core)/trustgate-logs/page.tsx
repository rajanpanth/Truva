'use client';

import { useState, useMemo } from 'react';
import { TruvaStatusPill, TruvaButton, TruvaStatCard, TruvaPulsingDot } from '@/components/ui/truva';
import { Shield, Search, Download, Activity, Clock, ShieldCheck } from 'lucide-react';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import type { TrustGateLog } from '@/backend/types/trustgate';

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
    ? Math.round(logs.reduce((s, l) => s + (l.latency_ms ?? 0), 0) / logs.length)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold">TRUSTGATE_LOGS</h1>
            <TruvaStatusPill variant="live" />
          </div>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">REAL-TIME VERIFICATION STREAM · BUFFER: {logs.length} ENTRIES</p>
        </div>
        <TruvaButton variant="outlined" className="text-[12px] flex items-center gap-1.5">
          <Download size={12} /> EXPORT_CSV
        </TruvaButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TruvaStatCard label="TOTAL_VERIFIED" value={isLoading ? 'LOADING' : logs.length.toString()} sub="IN BUFFER" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="PASS_RATE" value={logs.length ? `${((passedCount / logs.length) * 100).toFixed(1)}%` : 'N/A'} sub={`${passedCount} PASSED`} icon={<Shield size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="BLOCKED" value={isLoading ? 'LOADING' : blockedCount.toString()} sub="VIOLATIONS DETECTED" icon={<Activity size={16} className="text-[var(--red)]" />} />
        <TruvaStatCard label="AVG_LATENCY" value={isLoading ? 'LOADING' : `${avgLatency}ms`} sub="P99 ALL TIME" icon={<Clock size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[300px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            placeholder="SEARCH_AGENT_OR_ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-green)] focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {['ALL', 'PASSED', 'BLOCKED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[12px] uppercase tracking-[2px] rounded-[2px] border transition-colors ${
                filter === f
                  ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['', 'TIMESTAMP', 'AGENT_NAME', 'ACTION', 'SESSION_ID', 'STATUS', 'LATENCY'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 w-16 animate-pulse rounded bg-[var(--bg-elevated)]" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.slice(0, 50).map((l: TrustGateLog, i: number) => (
                  <tr key={l.id ?? i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="pl-4 py-2.5">
                      {i === 0 && <TruvaPulsingDot size={6} />}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)]">
                      {new Date(l.created_at).toISOString().substring(11, 19)}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--accent-green)] font-bold">
                      {l.agent_name ?? l.agent_id?.slice(0, 12)}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">{l.action}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)] font-mono">
                      {l.session_id ? `${l.session_id.slice(0, 6)}...${l.session_id.slice(-4)}` : 'N/A'}
                    </td>
                    <td className="px-4 py-2.5"><TruvaStatusPill variant={l.status as 'passed' | 'blocked'} /></td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">
                      {l.latency_ms != null ? `${l.latency_ms}ms` : 'N/A'}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)]">
          SHOWING {Math.min(50, filtered.length)} OF {filtered.length} ENTRIES
        </span>
        <div className="flex items-center gap-2">
          <TruvaPulsingDot size={5} />
          <span className="text-[12px] uppercase tracking-[2px] text-[var(--accent-green)]">AUTO-REFRESH: 5s</span>
        </div>
      </div>
    </div>
  );
}
