'use client';

import { useAgent } from '@/lib/hooks/useAgents';
import { TIER_LABELS } from '@/backend/types/agent';
import { TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaBadge, TruvaButton, TruvaCheckTag } from '@/components/ui/truva';
import { Shield, ShieldCheck, Zap, TrendingUp, Activity, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const { data: agent, isLoading, isError } = useAgent(params.id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-[var(--bg-card)] rounded-[2px]" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--bg-card)] rounded-[2px]" />
          ))}
        </div>
        <div className="h-64 bg-[var(--bg-card)] rounded-[2px]" />
      </div>
    );
  }

  if (isError || !agent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle size={40} className="text-[var(--status-blocked)] mb-4 opacity-60" />
        <h1 className="text-[20px] font-bold mb-2">AGENT_NOT_FOUND</h1>
        <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] mb-6">
          No passport registered for ID: {params.id}
        </p>
        <Link href="/registry">
          <TruvaButton variant="outlined" className="text-[12px]">BACK_TO_REGISTRY</TruvaButton>
        </Link>
      </div>
    );
  }

  const tierName = TIER_LABELS[agent.tier];
  const tierLower = tierName.toLowerCase() as 'bronze' | 'silver' | 'gold';
  const agentStatus = agent.is_flagged ? 'flagged' : agent.is_active ? 'active' : 'inactive';
  const successPct = agent.success_rate != null ? agent.success_rate * 100 : 0;

  const terminalLines = [
    `[AUTH] Session initiated for ${agent.name.toUpperCase()} · NODE_SOLANA_01`,
    `[SYS] Trust score: ${agent.trust_score} · Tier: ${tierName}`,
    `[SYS] Task type: ${agent.task_type.toUpperCase()} · Status: ${agentStatus.toUpperCase()}`,
    `[TX] Success rate: ${successPct.toFixed(2)}% · Max TX: ${agent.max_tx_size.toLocaleString()}`,
    `[AUTH] Rate limit: ${agent.rate_limit}/min`,
    agent.pda_address ? `[CHAIN] PDA: ${agent.pda_address}` : '[CHAIN] PDA: pending on-chain registration',
    `[SYS] Registered: ${new Date(agent.registered_at ?? agent.created_at).toLocaleDateString()}`,
    `[SYS] Last updated: ${new Date(agent.updated_at).toLocaleDateString()}`,
  ];

  const complianceData = [
    { label: 'KYA_STATUS', value: agent.is_flagged ? 'FLAGGED' : 'VERIFIED', color: agent.is_flagged ? 'var(--status-blocked)' : 'var(--accent-green)' },
    { label: 'OPERATING_LIMIT', value: `${agent.max_tx_size.toLocaleString()} MAX_TX`, color: 'var(--text-primary)' },
    { label: 'RATE_LIMIT', value: `${agent.rate_limit}/MIN`, color: 'var(--text-primary)' },
    { label: 'REGISTERED', value: new Date(agent.registered_at ?? agent.created_at).toLocaleDateString(), color: 'var(--text-primary)' },
    { label: 'RISK_CLASSIFICATION', value: agent.is_flagged ? 'HIGH' : successPct >= 90 ? 'LOW' : 'MEDIUM', color: agent.is_flagged ? 'var(--status-blocked)' : 'var(--accent-green)' },
    { label: 'TASK_TYPE', value: agent.task_type.toUpperCase(), color: 'var(--text-primary)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
            <Shield size={24} className="text-[var(--accent-green)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-bold">{agent.name.toUpperCase().replace(/\s+/g, '_')}</h1>
              <TruvaBadge variant={tierLower} />
              <TruvaStatusPill variant={agentStatus as 'active' | 'inactive'} />
            </div>
            <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">
              ID: {agent.public_key.slice(0, 8)}...{agent.public_key.slice(-4)} · OPERATOR: {agent.operator_name}
            </p>
          </div>
        </div>
        <TruvaButton variant="outlined" className="text-[12px]">EXPORT_PASSPORT</TruvaButton>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-5 row-span-1 flex flex-col items-center justify-center text-center">
          <Shield size={32} className="text-[var(--accent-green)] mb-2" />
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)] mb-1">TRUST_SCORE</div>
          <div className="text-[36px] font-bold">{agent.trust_score}</div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1">TIER: {tierName.toUpperCase()}</div>
        </div>
        <TruvaStatCard label="SUCCESS_RATE" value={`${successPct.toFixed(1)}%`} sub="TRANSACTION SUCCESS" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="RATE_LIMIT" value={`${agent.rate_limit}/m`} sub="MAX REQUESTS/MIN" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="MAX_TX_SIZE" value={agent.max_tx_size.toLocaleString()} sub="LAMPORTS" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="CHAINS" value={String(agent.chains?.length ?? 1)} sub="SUPPORTED CHAINS" icon={<TrendingUp size={16} className="text-[var(--accent-green)]" />} />
      </div>

      {/* Capabilities */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 mb-6">
        <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">DECLARED_CAPABILITIES</h3>
        <div className="flex flex-wrap gap-2">
          {(agent.chains ?? ['SOLANA']).map((c: string) => (
            <TruvaCheckTag key={c} label={c.toUpperCase()} />
          ))}
          <TruvaCheckTag label={agent.task_type.toUpperCase()} />
          {agent.spending_behavior && <TruvaCheckTag label={agent.spending_behavior.toUpperCase()} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* System Activity Log - Terminal */}
        <div>
          <TruvaTerminal
            title="SYSTEM_ACTIVITY_LOG"
            lines={terminalLines}
            showCursor
            maxHeight="360px"
          />
        </div>

        {/* Compliance Manifesto */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">COMPLIANCE_MANIFESTO_V.2</h3>
          <div className="space-y-3">
            {complianceData.map((c) => (
              <div key={c.label} className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--text-secondary)]">{c.label}</span>
                <span className="text-[12px] font-bold" style={{ color: c.color }}>{c.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <h4 className="text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] mb-2">RISK_METRICS</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[var(--text-secondary)]">SUCCESS_RATE</span>
                  <span className="text-[var(--accent-green)]">{successPct.toFixed(2)}%</span>
                </div>
                <TruvaProgressBar value={successPct} color="var(--accent-green)" />
              </div>
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[var(--text-secondary)]">TRUST_SCORE</span>
                  <span className="text-[var(--accent-green)]">{agent.trust_score}%</span>
                </div>
                <TruvaProgressBar value={agent.trust_score} color="var(--accent-green)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
