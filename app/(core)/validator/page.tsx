'use client';

import { useState } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaButton, TruvaPulsingDot } from '@/components/ui/truva';
import { ShieldCheck, Zap, Award, TrendingUp, AlertTriangle, Server, Cpu, HardDrive, Key, Settings } from 'lucide-react';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import type { TrustGateLog } from '@/backend/types/trustgate';

function RewardChart() {
  const data = [65, 72, 58, 81, 90, 85, 78, 92, 88, 95, 87, 91];
  const labels = ['E401','E402','E403','E404','E405','E406','E407','E408','E409','E410','E411','E412'];
  const max = Math.max(...data);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-[100px]">
        {data.map((v, i) => {
          const isLast = i === data.length - 1;
          const pct = (v / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: `${pct}%`,
                  background: isLast
                    ? 'var(--accent-green)'
                    : `linear-gradient(180deg, rgba(0,232,122,0.5), rgba(0,232,122,0.2))`,
                  boxShadow: isLast ? '0 0 8px rgba(0,232,122,0.4)' : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center" style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

export default function ValidatorDashboard() {
  const { data: logsData } = useTrustGateLogs({ limit: 10 });
  const rawLogs: TrustGateLog[] = logsData?.data ?? [];

  const terminalLines = rawLogs.length > 0
    ? rawLogs.map((l: TrustGateLog) =>
        `[${l.status === 'blocked' ? 'BLOCKED' : 'TX'}] ${l.agent_name ?? l.agent_id?.slice(0, 8)} · ${l.action} · ${l.latency_ms != null ? l.latency_ms + 'ms' : '—'}`
      )
    : ['[SYS] Awaiting log data from TrustGate...'];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(0,232,122,0.15),rgba(0,232,122,0.05))', border: '1px solid rgba(0,232,122,0.2)' }}>
              <Key size={16} className="text-[var(--accent-green)]" />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">Validator Dashboard</h1>
            <TruvaStatusPill variant="online" />
          </div>
          <p className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)] ml-11">
            Node_001 · Solana Mainnet · Epoch 412
          </p>
        </div>
        <TruvaButton variant="ghost" className="text-[11px] gap-1.5 self-start sm:self-auto">
          <Settings size={12} /> Validator Settings
        </TruvaButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TruvaStatCard label="BLOCKS VALIDATED" value="8,924" sub="This epoch" icon={<ShieldCheck size={15} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="REWARDS EARNED" value="2,450 TRU" sub="↑ 12% vs last epoch" icon={<Award size={15} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="UPTIME" value="99.97%" sub="Last 30 days" icon={<TrendingUp size={15} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="STAKE LOCKED" value="1.2M TRU" sub="Until epoch 500" icon={<Zap size={15} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Terminal */}
        <TruvaTerminal title="VALIDATION_LOG" lines={terminalLines} showCursor maxHeight="300px" />

        {/* Reward Trajectory */}
        <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] uppercase tracking-[2px] font-bold">Reward Trajectory</h3>
            <span className="text-[11px] text-[var(--accent-green)] font-bold">↑ 38.4%</span>
          </div>
          <RewardChart />
          <div className="flex items-center justify-between text-[11px] mt-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-[var(--text-muted)] uppercase tracking-[2px]">12-Epoch Trend</span>
            <div className="flex items-center gap-1.5">
              <TruvaPulsingDot size={4} />
              <span className="text-[var(--accent-green)]">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-5">System Telemetry</h3>
          <div className="space-y-4">
            {[
              { label: 'CPU Usage', value: 34, icon: <Cpu size={13} />, warn: 80 },
              { label: 'Memory', value: 62, icon: <Server size={13} />, warn: 85 },
              { label: 'Disk I/O', value: 18, icon: <HardDrive size={13} />, warn: 70 },
              { label: 'Network BW', value: 45, icon: <Zap size={13} />, warn: 90 },
            ].map((m) => {
              const color = m.value > m.warn ? 'var(--red)' : m.value > m.warn * 0.7 ? '#f59e0b' : 'var(--accent-green)';
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                      <span style={{ color: 'var(--text-muted)' }}>{m.icon}</span>
                      {m.label}
                    </div>
                    <span className="text-[12px] font-bold tabular-nums" style={{ color }}>{m.value}%</span>
                  </div>
                  <TruvaProgressBar value={m.value} color={color} height={5} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: 'rgba(0,232,122,0.06)', border: '1px solid rgba(0,232,122,0.25)' }}>
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-[var(--accent-green)] mt-0.5 shrink-0" />
              <div>
                <div className="text-[13px] font-bold text-[var(--accent-green)] mb-1">All Systems Nominal</div>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  Validator node operating within normal parameters. No anomalies detected in the last 24 hours.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[#f59e0b] mt-0.5 shrink-0" />
              <div>
                <div className="text-[13px] font-bold text-[#f59e0b] mb-1">Epoch Transition Pending</div>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  Epoch 413 begins in ~2h 14m. Ensure stake delegation is confirmed before transition.
                </p>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          {[
            { title: 'ZK Proof Engine', desc: 'Zero-knowledge proof generation for transaction privacy.', icon: <ShieldCheck size={16} /> },
            { title: 'Consensus Module', desc: 'Byzantine fault-tolerant with sub-second finality.', icon: <Server size={16} /> },
          ].map((f) => (
            <div key={f.title} className="rounded-xl p-4" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
              <div className="flex items-center gap-2.5">
                <span className="text-[var(--accent-green)]">{f.icon}</span>
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-wide">{f.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attestation */}
      <AttestationForm />
    </div>
  );
}

function AttestationForm() {
  const [agentId, setAgentId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId.trim(), event_type: 'attested', description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setStatus('success');
      setMessage(`Attestation recorded. Score delta: ${json.data?.score_delta >= 0 ? '+' : ''}${json.data?.score_delta ?? '—'}`);
      setAgentId('');
      setDescription('');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div className="rounded-xl p-5" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.2)' }}>
          <ShieldCheck size={14} className="text-[var(--accent-green)]" />
        </div>
        <h3 className="text-[13px] uppercase tracking-[2px] font-bold">Submit Attestation</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-[10px] uppercase tracking-[3px] text-[var(--text-muted)] mb-2">Agent UUID</label>
          <input
            required value={agentId} onChange={(e) => setAgentId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-4 py-2.5 rounded-lg text-[12px] font-mono placeholder:text-[var(--text-dim)]"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[3px] text-[var(--text-muted)] mb-2">Description (optional)</label>
          <input
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Observed behaviour, source of attestation..."
            className="w-full px-4 py-2.5 rounded-lg text-[12px] font-mono placeholder:text-[var(--text-dim)]"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
        </div>
        <div className="flex items-center gap-4">
          <TruvaButton type="submit" variant="primary" disabled={status === 'loading'} className="text-[11px]">
            {status === 'loading' ? 'Submitting...' : 'Submit Attestation'}
          </TruvaButton>
          {status === 'success' && <span className="text-[12px] text-[var(--accent-green)]">{message}</span>}
          {status === 'error' && <span className="text-[12px] text-[var(--red)]">{message}</span>}
        </div>
      </form>
    </div>
  );
}
