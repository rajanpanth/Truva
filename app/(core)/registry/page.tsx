'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaButton, TruvaProgressBar, TruvaBadge } from '@/components/ui/truva';
import { Shield, Search, Users, Award, Star, ChevronDown, Plus, ArrowRight } from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import { TIER_LABELS } from '@/backend/types/agent';
import type { Agent } from '@/backend/types/agent';

const tierColors: Record<string, string> = {
  platinum: 'var(--tier-platinum)', gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)', bronze: 'var(--tier-bronze)',
};

const allTiers = ['all', 'gold', 'silver', 'bronze'] as const;
const allCategories = ['ALL_TYPES', 'trading', 'yield', 'data', 'execution', 'risk', 'treasury', 'monitoring', 'payment'] as const;

function tierLabel(a: Agent): string {
  return TIER_LABELS[a.tier].toLowerCase();
}

export default function RegistryPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL_TYPES');

  const { data: agents = [], isLoading, isError } = useAgents({ search: search || undefined });

  const filtered = useMemo(() => agents.filter((a) => {
    const tl = tierLabel(a);
    const matchTier = tierFilter === 'all' || tl === tierFilter;
    const matchCat = categoryFilter === 'ALL_TYPES' || a.task_type === categoryFilter;
    return matchTier && matchCat;
  }), [agents, tierFilter, categoryFilter]);

  const hasFilters = tierFilter !== 'all' || categoryFilter !== 'ALL_TYPES' || search;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(0,232,122,0.15),rgba(0,232,122,0.05))', border: '1px solid rgba(0,232,122,0.2)' }}>
              <Shield size={16} className="text-[var(--accent-green)]" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">Agent Registry</h1>
          </div>
          <p className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)] ml-11">
            Verified autonomous entities · Mainnet cluster v1.2
          </p>
        </div>
        <Link href="/register">
          <TruvaButton variant="primary" className="text-[11px] gap-1.5 self-start">
            <Plus size={12} /> Register Agent
          </TruvaButton>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TruvaStatCard
          label="TOTAL REGISTERED"
          value={isLoading ? '—' : String(filtered.length)}
          sub="Across all tiers"
          icon={<Users size={15} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="AVG TRUST SCORE"
          value={isLoading || !filtered.length ? '—' : (filtered.reduce((s, a) => s + a.trust_score, 0) / filtered.length).toFixed(1)}
          sub="↑ 2.1% this epoch"
          icon={<Award size={15} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="ELITE AGENTS"
          value={isLoading ? '—' : String(filtered.filter(a => a.tier >= 2).length)}
          sub="Gold tier & above"
          icon={<Star size={15} className="text-[var(--tier-gold)]" />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent name or ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[12px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
        </div>

        {/* Tier pills */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          {allTiers.map((t) => {
            const active = tierFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-[2px] rounded-md font-medium transition-all duration-200 ${
                  active
                    ? t === 'all'
                      ? 'text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                      : 'bg-[var(--bg-elevated)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                style={active && t !== 'all' ? { color: tierColors[t] } : undefined}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Category select */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-lg text-[12px] uppercase tracking-[1px] font-mono cursor-pointer focus:outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          >
            {allCategories.map((c) => (
              <option key={c} value={c} style={{ background: 'var(--bg-base)' }}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setTierFilter('all'); setCategoryFilter('ALL_TYPES'); setSearch(''); }}
            className="text-[11px] uppercase tracking-[2px] text-[var(--red)] hover:text-[var(--red)] opacity-70 hover:opacity-100 transition-opacity"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-[11px] uppercase tracking-[2px] text-[var(--text-muted)]">
          <span className="text-[var(--text-secondary)]">{filtered.length}</span> of {agents.length} agents
        </span>
      </div>

      {/* Grid */}
      {isError && (
        <div className="text-center py-20 rounded-xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
          <Shield size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-[12px] uppercase tracking-[2px] text-[var(--red)]">Failed to load agents</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }} />
          ))}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-20 rounded-xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
          <Shield size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)]">No agents match filters</p>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const tl = tierLabel(a) as 'platinum' | 'gold' | 'silver' | 'bronze';
            const agentStatus = a.is_flagged ? 'flagged' : a.is_active ? 'active' : 'inactive';
            const initials = a.name.split(/[\s_]/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
            const uptimeDisplay = a.success_rate != null ? `${(a.success_rate * 100).toFixed(1)}%` : '—';
            const tc = tierColors[tl];
            return (
              <div
                key={a.id}
                className="rounded-xl overflow-hidden transition-all duration-200 group"
                style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              >
                {/* Top accent stripe */}
                <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${tc}, transparent)` }} />

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0"
                        style={{ background: `${tc}15`, color: tc, border: `1px solid ${tc}30` }}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[var(--text-primary)]">{a.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                          {a.public_key.slice(0, 8)}…{a.public_key.slice(-4)}
                        </div>
                      </div>
                    </div>
                    <TruvaStatusPill variant={agentStatus as 'active' | 'inactive' | 'flagged'} />
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-4">
                    <TruvaBadge variant={tl} />
                    <span className="text-[11px] uppercase tracking-[1px] text-[var(--text-muted)]">
                      {a.task_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Trust score */}
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[2px] mb-1.5">
                    <span className="text-[var(--text-muted)]">Trust Score</span>
                    <span className="font-bold tabular-nums" style={{ color: tc }}>{a.trust_score}%</span>
                  </div>
                  <TruvaProgressBar value={a.trust_score} color={tc} height={5} />

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-muted)]">Max Tx Size</div>
                      <div className="text-[12px] font-bold mt-0.5 tabular-nums">{a.max_tx_size.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-muted)]">Success Rate</div>
                      <div className="text-[12px] font-bold mt-0.5 tabular-nums">{uptimeDisplay}</div>
                    </div>
                  </div>

                  <Link href={`/agent/${a.id}`}>
                    <button
                      className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] uppercase tracking-[2px] font-medium transition-all duration-200"
                      style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = tc; e.currentTarget.style.color = tc; e.currentTarget.style.background = `${tc}0d`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      View Passport <ArrowRight size={11} />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <TruvaButton variant="ghost" className="text-[11px] px-8">Load More</TruvaButton>
        </div>
      )}
    </div>
  );
}
