'use client';

import { useEffect, useState, useMemo } from 'react';
import { TruvaStatusPill, TruvaButton, TruvaStatCard, TruvaPulsingDot } from '@/components/ui/truva';
import { Shield, Search, Filter, Download, Activity, Clock, ShieldCheck } from 'lucide-react';

function generateLog(i: number) {
  const agents = ['TRADEBOT_X', 'LIQUID_FLOW', 'ORACLE_EYE', 'GUARD_PROTO', 'NEXUS_BRIDGE', 'SENTINEL_V2'];
  const actions = ['SWAP_VALIDATED', 'PRICE_ORACLE_VERIFIED', 'LP_REBALANCE', 'ANOMALY_SCAN', 'CROSS_CHAIN_BRIDGE', 'DATA_FEED_SYNC', 'RISK_ASSESSMENT', 'ARBITRAGE_EXECUTE'];
  const statuses = ['passed', 'passed', 'passed', 'passed', 'blocked', 'passed', 'passed', 'pending'] as const;
  const hash = `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`;
  const lat = [4, 8, 12, 15, 22, 6, 18, 45][i % 8];
  const d = new Date(Date.now() - i * 3200);
  const ts = d.toISOString().substring(11, 19);
  return { ts, agent: agents[i % agents.length], action: actions[i % actions.length], hash, status: statuses[i % statuses.length], latency: `${lat}ms` };
}

export default function TrustGateLogsPage() {
  const [logs, setLogs] = useState(() => Array.from({ length: 20 }, (_, i) => generateLog(i)));
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setInterval(() => {
      setLogs((prev) => {
        const newLog = {
          ts: new Date().toISOString().substring(11, 19),
          agent: ['TRADEBOT_X', 'LIQUID_FLOW', 'ORACLE_EYE', 'GUARD_PROTO'][Math.floor(Math.random() * 4)],
          action: ['SWAP_VALIDATED', 'LP_REBALANCE', 'DATA_FEED_SYNC', 'RISK_ASSESSMENT'][Math.floor(Math.random() * 4)],
          hash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
          status: (Math.random() > 0.15 ? 'passed' : 'blocked') as 'passed' | 'blocked',
          latency: `${Math.floor(Math.random() * 40 + 4)}ms`,
        };
        return [newLog, ...prev.slice(0, 49)];
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => logs.filter((l) => {
    if (filter !== 'ALL' && l.status !== filter.toLowerCase()) return false;
    if (search && !l.agent.toLowerCase().includes(search.toLowerCase()) && !l.hash.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [logs, filter, search]);

  const passedCount = useMemo(() => logs.filter((l) => l.status === 'passed').length, [logs]);
  const blockedCount = useMemo(() => logs.filter((l) => l.status === 'blocked').length, [logs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold">TRUSTGATE_LOGS</h1>
            <TruvaStatusPill variant="live" />
          </div>
          <p className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">REAL-TIME VERIFICATION STREAM · BUFFER: {logs.length} ENTRIES</p>
        </div>
        <TruvaButton variant="outlined" className="text-[9px] flex items-center gap-1.5">
          <Download size={12} /> EXPORT_CSV
        </TruvaButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <TruvaStatCard label="TOTAL_VERIFIED" value={logs.length.toString()} sub="IN BUFFER" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="PASS_RATE" value={`${((passedCount / logs.length) * 100).toFixed(1)}%`} sub={`${passedCount} PASSED`} icon={<Shield size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="BLOCKED" value={blockedCount.toString()} sub="VIOLATIONS DETECTED" icon={<Activity size={16} className="text-[var(--red)]" />} />
        <TruvaStatCard label="AVG_LATENCY" value="14ms" sub="P99: 45ms" icon={<Clock size={16} className="text-[var(--accent-green)]" />} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[300px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            placeholder="SEARCH_AGENT_OR_HASH"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[11px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-green)] focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {['ALL', 'PASSED', 'BLOCKED', 'PENDING'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[9px] uppercase tracking-[2px] rounded-[2px] border transition-colors ${
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

      {/* Log Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['', 'TIMESTAMP', 'AGENT_ID', 'ACTION', 'TX_HASH', 'STATUS', 'LATENCY'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 20).map((l, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                <td className="pl-4 py-2.5">
                  {i === 0 && <TruvaPulsingDot size={6} />}
                </td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)]">{l.ts}</td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--accent-green)] font-bold">{l.agent}</td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">{l.action}</td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)]">{l.hash}</td>
                <td className="px-4 py-2.5"><TruvaStatusPill variant={l.status} /></td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">{l.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-[9px] uppercase tracking-[2px] text-[var(--text-muted)]">
          SHOWING {Math.min(20, filtered.length)} OF {filtered.length} ENTRIES
        </span>
        <div className="flex items-center gap-2">
          <TruvaPulsingDot size={5} />
          <span className="text-[9px] uppercase tracking-[2px] text-[var(--accent-green)]">AUTO-REFRESH: 4s</span>
        </div>
      </div>
    </div>
  );
}
