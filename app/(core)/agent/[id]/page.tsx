import { TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaBadge, TruvaButton, TruvaCheckTag } from '@/components/ui/truva';
import { Shield, ShieldCheck, Zap, TrendingUp, Activity } from 'lucide-react';

const terminalLines = [
  '[AUTH] Session initiated for TRADEBOT_X · NODE_SOLANA_01',
  '[TX] SWAP_VALIDATED · 0xB5Fe01 · 12ms · PASS',
  '[SYS] Heartbeat OK · Latency 4ms · Memory 62%',
  '[TX] CROSS_CHAIN_BRIDGE · 0xC29e0D · 22ms · PASS',
  '[AUTH] Re-authentication cycle · TOKEN_REFRESH',
  '[TX] LP_REBALANCE · 0x91Ab45 · 15ms · PASS',
  '[WARN] Rate limit approaching · 85% of 10k/min',
  '[TX] ARBITRAGE_EXECUTE · 0xD47b2F · 9ms · PASS',
  '[SYS] Epoch 412 checkpoint · All validators confirmed',
];

const complianceData = [
  { label: 'KYA_STATUS', value: 'VERIFIED', color: 'var(--accent-green)' },
  { label: 'OPERATING_LIMIT', value: '$10.0M DAILY', color: 'var(--text-primary)' },
  { label: 'JURISDICTION', value: 'GLOBAL_MESH', color: 'var(--text-primary)' },
  { label: 'LAST_AUDIT', value: '2024-05-23', color: 'var(--text-primary)' },
  { label: 'RISK_CLASSIFICATION', value: 'LOW', color: 'var(--accent-green)' },
  { label: 'REGISTRATION_EPOCH', value: '389', color: 'var(--text-primary)' },
];

export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const slug = params.id || 'tradebot-x';
  const agentName = slug.replace(/-/g, '_').toUpperCase();

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
              <h1 className="text-[24px] font-bold">{agentName}</h1>
              <TruvaBadge variant="platinum" />
              <TruvaStatusPill variant="active" />
            </div>
            <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">ID: 0xAF2C...FFC2 · REPUTATION_STAMP: AF-9283-TR-001</p>
          </div>
        </div>
        <TruvaButton variant="outlined" className="text-[12px]">EXPORT_PASSPORT</TruvaButton>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Trust Score - tall card */}
        <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-5 row-span-1 flex flex-col items-center justify-center text-center">
          <Shield size={32} className="text-[var(--accent-green)] mb-2" />
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)] mb-1">TRUST_SCORE</div>
          <div className="text-[36px] font-bold">99.8</div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1">PERCENTILE: TOP 0.1%</div>
        </div>
        <TruvaStatCard label="RELIABILITY" value="99.98%" sub="UPTIME LAST 90 DAYS" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="AVG_LATENCY" value="4.2ms" sub="P99: 12ms" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="TX_PROCESSED" value="142,847" sub="LAST 30 DAYS" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="STAKED_AMOUNT" value="500K TRU" sub="LOCKED UNTIL EPOCH 500" icon={<TrendingUp size={16} className="text-[var(--accent-green)]" />} />
      </div>

      {/* Capabilities */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 mb-6">
        <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">DECLARED_CAPABILITIES</h3>
        <div className="flex flex-wrap gap-2">
          {['SWAP_EXECUTION', 'CROSS_CHAIN_BRIDGE', 'ARBITRAGE_DETECTION', 'LP_MANAGEMENT', 'ORACLE_READING', 'RISK_ASSESSMENT'].map((c) => (
            <TruvaCheckTag key={c} label={c} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-6">
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
                  <span className="text-[var(--text-secondary)]">VIOLATION_RATE</span>
                  <span className="text-[var(--accent-green)]">0.02%</span>
                </div>
                <TruvaProgressBar value={0.02} color="var(--accent-green)" />
              </div>
              <div>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[var(--text-secondary)]">COMPLIANCE_SCORE</span>
                  <span className="text-[var(--accent-green)]">100%</span>
                </div>
                <TruvaProgressBar value={100} color="var(--accent-green)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
