'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TruvaStatCard, TruvaStatusPill, TruvaButton } from '@/components/ui/truva';
import { ShieldCheck, Zap, Users, TrendingUp, Shield } from 'lucide-react';

const tierColors: Record<string, string> = {
  gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)',
  bronze: 'var(--tier-bronze)',
};

const connectedAgents = [
  { name: 'Tradebot X', id: '0xAF2C...FFC2', tier: 'gold' as const, score: 99.8, status: 'active' as const },
  { name: 'Liquid Flow', id: '0x9B6D...CA29', tier: 'gold' as const, score: 94.2, status: 'active' as const },
  { name: 'Oracle Eye', id: '0xB412...1D00', tier: 'silver' as const, score: 88.5, status: 'standby' as const },
  { name: 'Guard Proto', id: '0x8483...9F5D', tier: 'bronze' as const, score: 62.1, status: 'active' as const },
];

const logData = [
  { ts: '14:23:01', agent: 'Tradebot X', action: 'SWAP_VALIDATED', hash: '0xB5...Fe01', status: 'passed' as const, latency: '12ms' },
  { ts: '14:22:58', agent: 'Oracle Eye', action: 'PRICE_ORACLE_VERIFIED', hash: '0xA3...Dc12', status: 'passed' as const, latency: '8ms' },
  { ts: '14:22:55', agent: 'Liquid Flow', action: 'LP_REBALANCE', hash: '0x91...Ab45', status: 'passed' as const, latency: '15ms' },
  { ts: '14:22:52', agent: 'Guard Proto', action: 'ANOMALY_SCAN', hash: '0xF7...1a3B', status: 'blocked' as const, latency: '45ms' },
  { ts: '14:22:48', agent: 'Tradebot X', action: 'CROSS_CHAIN_BRIDGE', hash: '0xC2...9e0D', status: 'passed' as const, latency: '22ms' },
  { ts: '14:22:44', agent: 'Oracle Eye', action: 'DATA_FEED_SYNC', hash: '0xD4...7b2F', status: 'passed' as const, latency: '6ms' },
  { ts: '14:22:40', agent: 'Liquid Flow', action: 'LIQUIDITY_INJECTION', hash: '0xE8...3c4A', status: 'passed' as const, latency: '18ms' },
  { ts: '14:22:36', agent: 'Guard Proto', action: 'RISK_ASSESSMENT', hash: '0x77...5d8E', status: 'pending' as const, latency: '—' },
];

const payments = [
  { date: '2024-05-24', desc: 'Validator Reward · Epoch 412', amount: '+2,450 TRU', status: 'passed' as const },
  { date: '2024-05-23', desc: 'Agent Registration Fee', amount: '-500 TRU', status: 'passed' as const },
  { date: '2024-05-22', desc: 'Slashing Penalty · Oracle Eye', amount: '-120 TRU', status: 'blocked' as const },
];

export default function DashboardPage() {
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().substring(11, 19));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <TruvaStatCard label="ACTIVE_AGENTS" value="4" sub="↑ 2 THIS EPOCH" icon={<Users size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TX_VALIDATED" value="12,847" sub="LAST 24H" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="AVG_LATENCY" value="14ms" sub="P99: 45ms" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TRUST_INDEX" value="94.2" sub="↑ 1.2% WoW" icon={<TrendingUp size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* Connected Agents */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] uppercase tracking-[2px] font-bold">CONNECTED_AGENTS</h3>
            <Link href="/registry"><TruvaButton variant="ghost" className="text-[12px] px-3 py-1">VIEW_ALL</TruvaButton></Link>
          </div>
          <div className="space-y-3">
            {connectedAgents.map((a) => (
              <div key={a.name} className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px]">
                <div className="w-8 h-8 bg-[var(--border-default)] rounded-[2px] flex items-center justify-center shrink-0">
                  <Shield size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold">{a.name}</span>
                    <TruvaStatusPill variant={a.tier} />
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{a.id}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-bold" style={{ color: tierColors[a.tier] }}>{a.score}%</div>
                  <TruvaStatusPill variant={a.status} />
                </div>
              </div>
            ))}
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
            {logData.map((l, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-[13px] hover:bg-[var(--bg-elevated)] rounded-[2px]">
                <span className="text-[var(--text-muted)] w-[54px] shrink-0">{l.ts}</span>
                <span className="text-[var(--accent-green)] w-[80px] shrink-0 truncate">{l.agent}</span>
                <span className="text-[var(--text-secondary)] flex-1 truncate">{l.action}</span>
                <TruvaStatusPill variant={l.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Settlement History */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
        <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">PAYMENT_SETTLEMENT_HISTORY</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['DATE', 'DESCRIPTION', 'AMOUNT', 'STATUS'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)]">
                <td className="px-4 py-3 text-[12px] text-[var(--text-muted)]">{p.date}</td>
                <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">{p.desc}</td>
                <td className={`px-4 py-3 text-[12px] font-bold ${p.amount.startsWith('+') ? 'text-[var(--accent-green)]' : 'text-[var(--red)]'}`}>{p.amount}</td>
                <td className="px-4 py-3"><TruvaStatusPill variant={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
