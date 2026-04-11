'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaButton, TruvaProgressBar, TruvaBadge } from '@/components/ui/truva';
import { Shield, Search, Users, Award, Star, ChevronDown } from 'lucide-react';

const tierColors: Record<string, string> = {
  gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)', bronze: 'var(--tier-bronze)',
};

const allTiers = ['all', 'gold', 'silver', 'bronze'] as const;
const allCategories = [
  'ALL_TYPES',
  'FINANCIAL_ARBITRAGE',
  'LIQUIDITY_PROVISION',
  'DATA_ORACLE',
  'SECURITY_MONITOR',
  'CROSS_CHAIN_BRIDGE',
  'COMPLIANCE_AUDIT',
] as const;

const agents = [
  { name: 'TRADEBOT_X', id: '0xAF2C...FFC2', tier: 'gold' as const, score: 99.8, status: 'active' as const, category: 'FINANCIAL_ARBITRAGE', txCount: '142,847', uptime: '99.99%' },
  { name: 'LIQUID_FLOW', id: '0x9B6D...CA29', tier: 'gold' as const, score: 94.2, status: 'active' as const, category: 'LIQUIDITY_PROVISION', txCount: '87,234', uptime: '99.92%' },
  { name: 'ORACLE_EYE', id: '0xB412...1D00', tier: 'silver' as const, score: 88.5, status: 'standby' as const, category: 'DATA_ORACLE', txCount: '54,102', uptime: '98.87%' },
  { name: 'GUARD_PROTO', id: '0x8483...9F5D', tier: 'bronze' as const, score: 62.1, status: 'active' as const, category: 'SECURITY_MONITOR', txCount: '31,450', uptime: '97.12%' },
  { name: 'NEXUS_BRIDGE', id: '0xC1A7...E4B3', tier: 'gold' as const, score: 91.7, status: 'active' as const, category: 'CROSS_CHAIN_BRIDGE', txCount: '68,912', uptime: '99.45%' },
  { name: 'SENTINEL_V2', id: '0xD9F2...7C01', tier: 'silver' as const, score: 85.3, status: 'standby' as const, category: 'COMPLIANCE_AUDIT', txCount: '22,876', uptime: '98.33%' },
];

export default function RegistryPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL_TYPES');

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      const matchSearch = search === '' || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === 'all' || a.tier === tierFilter;
      const matchCategory = categoryFilter === 'ALL_TYPES' || a.category === categoryFilter;
      return matchSearch && matchTier && matchCategory;
    });
  }, [search, tierFilter, categoryFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold">AGENT_REGISTRY</h1>
          <p className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">VERIFIED_AUTONOMOUS_ENTITIES · MAINNET_CLUSTER_V1.2</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH_AGENT_ID"
              className="pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[11px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] w-[220px] focus:border-[var(--accent-green)] focus:outline-none"
            />
          </div>
          <Link href="/register">
            <TruvaButton variant="primary" className="text-[9px]">REGISTER_NEW</TruvaButton>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-[2px] text-[var(--text-muted)]">FILTER_BY:</span>

        {/* Tier filter pills */}
        <div className="flex items-center gap-1.5">
          {allTiers.map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1 text-[10px] uppercase tracking-[1px] font-bold rounded-[2px] border transition-colors ${
                tierFilter === t
                  ? t === 'all'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green)]/10'
                    : `border-current bg-[var(--bg-elevated)]`
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)]'
              }`}
              style={tierFilter === t && t !== 'all' ? { color: tierColors[t] } : undefined}
            >
              {t === 'all' ? 'ALL_TIERS' : t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <div className="relative ml-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none px-3 py-1.5 pr-7 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[10px] uppercase tracking-[1px] text-[var(--text-primary)] font-mono cursor-pointer focus:border-[var(--accent-green)] focus:outline-none"
          >
            {allCategories.map((c) => (
              <option key={c} value={c} className="bg-[var(--bg-base)]">{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {(tierFilter !== 'all' || categoryFilter !== 'ALL_TYPES') && (
          <button
            onClick={() => { setTierFilter('all'); setCategoryFilter('ALL_TYPES'); setSearch(''); }}
            className="text-[10px] uppercase tracking-[1px] text-[var(--status-blocked)] hover:underline ml-1"
          >
            CLEAR_FILTERS
          </button>
        )}

        <span className="ml-auto text-[10px] uppercase tracking-[1px] text-[var(--text-muted)]">
          SHOWING {filtered.length} OF {agents.length}
        </span>
      </div>

      {/* Tier summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <TruvaStatCard label="TOTAL_REGISTERED" value={String(filtered.length)} sub="ACROSS ALL TIERS" icon={<Users size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="AVG_TRUST_SCORE" value={filtered.length ? (filtered.reduce((s, a) => s + a.score, 0) / filtered.length).toFixed(1) : '0'} sub="↑ 2.1% THIS EPOCH" icon={<Award size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ELITE_AGENTS" value={String(filtered.filter(a => a.tier === 'gold').length)} sub="GOLD TIER" icon={<Star size={16} className="text-[var(--tier-gold)]" />} />
      </div>

      {/* Agent Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Shield size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-[12px] uppercase tracking-[2px]">NO_AGENTS_MATCH_FILTERS</p>
          <p className="text-[10px] mt-1">Adjust your filter criteria above</p>
        </div>
      ) : (
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((a) => (
          <div key={a.name} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4 hover:border-[var(--border-active)] transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
                  <Shield size={16} className="text-[var(--text-muted)]" />
                </div>
                <div>
                  <div className="text-[13px] font-bold">{a.name}</div>
                  <div className="text-[9px] text-[var(--text-muted)]">{a.id}</div>
                </div>
              </div>
              <TruvaStatusPill variant={a.status} />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <TruvaBadge variant={a.tier} />
              <span className="text-[9px] uppercase tracking-[1px] text-[var(--text-muted)]">{a.category}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-1">
              <span>TRUST_SCORE</span>
              <span style={{ color: tierColors[a.tier] }}>{a.score}%</span>
            </div>
            <TruvaProgressBar value={a.score} color={tierColors[a.tier]} />

            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <div>
                <div className="text-[9px] uppercase tracking-[1px] text-[var(--text-muted)]">TX_COUNT</div>
                <div className="text-[12px] font-bold mt-0.5">{a.txCount}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[1px] text-[var(--text-muted)]">UPTIME</div>
                <div className="text-[12px] font-bold mt-0.5">{a.uptime}</div>
              </div>
            </div>

            <Link href={`/agent/${a.name.toLowerCase().replace(/_/g, '-')}`}>
              <TruvaButton variant="ghost" className="w-full mt-3 text-[9px]">VIEW_PASSPORT</TruvaButton>
            </Link>
          </div>
        ))}
      </div>
      )}

      <div className="flex justify-center mt-8">
        <TruvaButton variant="outlined" className="text-[9px] px-6">FETCH_ADDITIONAL_RECORDS</TruvaButton>
      </div>
    </div>
  );
}
