'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaButton, TruvaProgressBar, TruvaBadge } from '@/components/ui/truva';
import { Shield, Search, Users, Award, Star, ChevronDown } from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import { TIER_LABELS } from '@/backend/types/agent';
import type { Agent } from '@/backend/types/agent';

const tierColors: Record<string, string> = {
  platinum: 'var(--tier-platinum)',
  gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)',
  bronze: 'var(--tier-bronze)',
};

const allTiers = ['all', 'platinum', 'gold', 'silver', 'bronze'] as const;
const allCategories = ['ALL_TYPES', 'swap', 'transfer', 'stake', 'lend', 'bridge', 'nft_trade', 'governance', 'custom'] as const;

function tierKey(a: Agent): string {
  return TIER_LABELS[a.tier]?.toLowerCase() ?? 'bronze';
}

export default function RegistryPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL_TYPES');

  const { data: agents = [], isLoading } = useAgents({ search: search || undefined });

  const filtered = useMemo(() => {
    return agents.filter((a: Agent) => {
      const tl = tierKey(a);
      const matchTier = tierFilter === 'all' || tl === tierFilter;
      const matchCategory = categoryFilter === 'ALL_TYPES' || a.task_type === categoryFilter;
      return matchTier && matchCategory;
    });
  }, [agents, tierFilter, categoryFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold">AGENT_REGISTRY</h1>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">VERIFIED_AUTONOMOUS_ENTITIES · MAINNET_CLUSTER_V1.2</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH_AGENT_ID"
              className="pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] w-full sm:w-[220px] focus:border-[var(--accent-green)] focus:outline-none"
            />
          </div>
          <Link href="/register">
            <TruvaButton variant="primary" className="text-[12px]">REGISTER_NEW</TruvaButton>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-[13px] uppercase tracking-[2px] text-[var(--text-muted)]">FILTER_BY:</span>
        <div className="flex items-center gap-1.5">
          {allTiers.map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1 text-[13px] uppercase tracking-[1px] font-bold rounded-[2px] border transition-colors ${
                tierFilter === t
                  ? t === 'all'
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green)]/10'
                    : 'border-current bg-[var(--bg-elevated)]'
                  : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)]'
              }`}
              style={tierFilter === t && t !== 'all' ? { color: tierColors[t] } : undefined}
            >
              {t === 'all' ? 'ALL_TIERS' : t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="relative ml-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none px-3 py-1.5 pr-7 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[13px] uppercase tracking-[1px] text-[var(--text-primary)] font-mono cursor-pointer focus:border-[var(--accent-green)] focus:outline-none"
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
            className="text-[13px] uppercase tracking-[1px] text-[var(--status-blocked)] hover:underline ml-1"
          >
            CLEAR_FILTERS
          </button>
        )}
        <span className="ml-auto text-[13px] uppercase tracking-[1px] text-[var(--text-muted)]">
          SHOWING {filtered.length} OF {agents.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <TruvaStatCard label="TOTAL_REGISTERED" value={isLoading ? 'LOADING' : String(filtered.length)} sub="ACROSS ALL TIERS" icon={<Users size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="AVG_TRUST_SCORE" value={isLoading || !filtered.length ? 'LOADING' : (filtered.reduce((s, a) => s + a.trust_score, 0) / filtered.length).toFixed(1)} sub="ALL AGENTS" icon={<Award size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ELITE_AGENTS" value={isLoading ? 'LOADING' : String(filtered.filter((a: Agent) => a.tier === 3).length)} sub="GOLD TIER" icon={<Star size={16} className="text-[var(--tier-gold)]" />} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[200px] bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-[2px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Shield size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-[12px] uppercase tracking-[2px]">NO_AGENTS_MATCH_FILTERS</p>
          <p className="text-[13px] mt-1">Adjust your filter criteria above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a: Agent) => {
            const tl = tierKey(a) as 'platinum' | 'gold' | 'silver' | 'bronze';
            const tc = tierColors[tl] ?? tierColors.bronze;
            const agentStatus = a.is_flagged ? 'flagged' : a.is_active ? 'active' : 'inactive';
            return (
              <div key={a.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4 hover:border-[var(--border-active)] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
                      <Shield size={16} className="text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">{a.name}</div>
                      <div className="text-[12px] text-[var(--text-muted)] font-mono">{a.public_key.slice(0, 6)}&hellip;{a.public_key.slice(-4)}</div>
                    </div>
                  </div>
                  <TruvaStatusPill variant={agentStatus as 'active' | 'inactive' | 'flagged'} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <TruvaBadge variant={tl} />
                  <span className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)]">{a.task_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-1">
                  <span>TRUST_SCORE</span>
                  <span style={{ color: tc }}>{a.trust_score}%</span>
                </div>
                <TruvaProgressBar value={a.trust_score} color={tc} />
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <div>
                    <div className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)]">MAX_TX</div>
                    <div className="text-[12px] font-bold mt-0.5">{a.max_tx_size.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)]">SUCCESS_RATE</div>
                    <div className="text-[12px] font-bold mt-0.5">{a.success_rate != null ? `${a.success_rate.toFixed(1)}%` : 'N/A'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Link href={`/agent/${a.id}`}>
                    <TruvaButton variant="ghost" className="w-full text-[12px]">VIEW_PASSPORT</TruvaButton>
                  </Link>
                  <Link href={`/delegate/${a.id}`}>
                    <TruvaButton variant="primary" className="w-full text-[12px]">DELEGATE</TruvaButton>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
