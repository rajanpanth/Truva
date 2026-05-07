'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaBadge, TruvaButton, TruvaCheckTag } from '@/components/ui/truva';
import { Shield, ShieldCheck, Zap, TrendingUp, Activity } from 'lucide-react';
import type { Agent } from '@/backend/types/agent';

const TIER_BADGE: Record<number, 'bronze' | 'silver' | 'gold'> = { 1: 'bronze', 2: 'silver', 3: 'gold' };

function buildFallbackAgent(slug: string): Agent {
  const name = slug.replace(/-/g, '_').toUpperCase();
  return {
    id: slug,
    name,
    public_key: '0xAF2C...FFC2',
    operator_name: 'TRUVA_OPS',
    operator_email: 'ops@truva.ai',
    description: 'Autonomous AI agent operating on TruVa protocol.',
    task_type: 'trading',
    trust_score: 92,
    tier: 3,
    status: 'active',
    max_tx_size: 50000,
    rate_limit: 10000,
    success_rate: 99.8,
    spending_behavior: 'conservative',
    is_active: true,
    is_flagged: false,
    flagged: false,
    chains: ['solana', 'ethereum'],
    pda_address: 'PDA_' + name.slice(0, 8),
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setAgent(res.data);
        } else {
          setError('Agent not found');
          setAgent(buildFallbackAgent(id));
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load agent');
        setAgent(buildFallbackAgent(id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[13px] font-mono text-zinc-500 tracking-widest animate-pulse">LOADING_AGENT_PASSPORT...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[13px] font-mono text-zinc-500 tracking-widest animate-pulse">LOADING_AGENT_PASSPORT...</div>
      </div>
    );
  }

  const tierLabel = TIER_BADGE[agent.tier] ?? 'bronze';

  return (
    <div>
      {error && (
        <div className="mb-4 px-4 py-3 border border-yellow-500/20 bg-yellow-500/5 rounded-[2px] flex items-center gap-3">
          <span className="text-[13px] font-mono text-yellow-400 tracking-widest">⚠️ {error.toUpperCase()} — SHOWING_DEMO_DATA</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
            <Shield size={24} className="text-[var(--accent-green)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-bold">{agent.name}</h1>
              <TruvaBadge variant={tierLabel} />
              <TruvaStatusPill variant={agent.status === 'active' ? 'active' : agent.status === 'flagged' ? 'blocked' : 'standby'} />
            </div>
            <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">
              ID: {agent.public_key} · REGISTERED: {new Date(agent.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/agents/${id}/control`}>
            <TruvaButton variant="primary" className="text-[12px]">CONTROL_PANEL</TruvaButton>
          </Link>
          <TruvaButton variant="outlined" className="text-[12px]">EXPORT_PASSPORT</TruvaButton>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-5 flex flex-col items-center justify-center text-center">
          <Shield size={32} className="text-[var(--accent-green)] mb-2" />
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)] mb-1">TRUST_SCORE</div>
          <div className="text-[36px] font-bold">{agent.trust_score}</div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1">TIER: {tierLabel.toUpperCase()}</div>
        </div>
        <TruvaStatCard label="SUCCESS_RATE" value={`${agent.success_rate ?? 0}%`} sub="ALL TIME" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="RATE_LIMIT" value={`${agent.rate_limit}/min`} sub="MAX REQUESTS" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="MAX_TX_SIZE" value={`$${agent.max_tx_size.toLocaleString()}`} sub="PER TRANSACTION" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TASK_TYPE" value={agent.task_type.toUpperCase()} sub={agent.chains.join(', ').toUpperCase()} icon={<TrendingUp size={16} className="text-[var(--accent-green)]" />} />
      </div>

      {/* Operator & Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">OPERATOR_DETAILS</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">OPERATOR</span>
              <span className="font-bold">{agent.operator_name}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">EMAIL</span>
              <span className="font-bold">{agent.operator_email}</span>
            </div>
            {agent.pda_address && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">PDA</span>
                <span className="font-mono text-[13px]">{agent.pda_address}</span>
              </div>
            )}
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">STATUS</span>
              <span className={`font-bold ${agent.is_flagged ? 'text-red-500' : 'text-[var(--accent-green)]'}`}>
                {agent.is_flagged ? 'FLAGGED' : agent.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">CHAIN_SUPPORT</h3>
          <div className="flex flex-wrap gap-2">
            {agent.chains.map((chain) => (
              <TruvaCheckTag key={chain} label={chain.toUpperCase()} />
            ))}
          </div>
          {agent.description && (
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <h4 className="text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] mb-2">DESCRIPTION</h4>
              <p className="text-[12px] text-[var(--text-secondary)]">{agent.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Trust Score Progress */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
        <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">TRUST_METRICS</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[13px] mb-1">
              <span className="text-[var(--text-secondary)]">TRUST_SCORE</span>
              <span className="text-[var(--accent-green)]">{agent.trust_score}/100</span>
            </div>
            <TruvaProgressBar value={agent.trust_score} color="var(--accent-green)" />
          </div>
          <div>
            <div className="flex justify-between text-[13px] mb-1">
              <span className="text-[var(--text-secondary)]">SUCCESS_RATE</span>
              <span className="text-[var(--accent-green)]">{agent.success_rate ?? 0}%</span>
            </div>
            <TruvaProgressBar value={agent.success_rate ?? 0} color="var(--accent-green)" />
          </div>
        </div>
      </div>
    </div>
  );
}
