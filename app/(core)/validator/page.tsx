'use client';

import { useEffect, useState } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaButton } from '@/components/ui/truva';
import { ShieldCheck, Zap, Award, TrendingUp, AlertTriangle, Server, Cpu, HardDrive } from 'lucide-react';

function generateValidationLog(): string[] {
  const entries = [
    '[AUTH] Epoch 412 · Block 8,924,103 · Validator consensus reached',
    '[TX] Validated SWAP · TRADEBOT_X · 0xB5Fe01 · 12ms',
    '[SYS] Heartbeat OK · All nodes in sync · Latency 3ms',
    '[TX] Validated ORACLE_FEED · ORACLE_EYE · 0xA3Dc12 · 8ms',
    '[AUTH] ZK-proof batch verified · 48 proofs · 142ms total',
    '[TX] BLOCKED · GUARD_PROTO · Anomaly score 0.87 · 0xF71a3B',
    '[INFO] Reward distribution · +245 TRU · Epoch 411 settlement',
    '[TX] Validated BRIDGE_OP · NEXUS_BRIDGE · 0xC29e0D · 22ms',
    '[SYS] Memory optimized · GC cycle complete · 1.2GB freed',
    '[HB] Peer discovery · 12 validators online · Quorum maintained',
  ];
  return entries;
}

/* Simple bar chart using divs */
function RewardChart() {
  const data = [65, 72, 58, 81, 90, 85, 78, 92, 88, 95, 87, 91];
  const labels = ['E401', 'E402', 'E403', 'E404', 'E405', 'E406', 'E407', 'E408', 'E409', 'E410', 'E411', 'E412'];

  return (
    <div>
      <div className="flex items-end gap-[6px] h-[120px]">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-[var(--accent-green)] rounded-[1px] transition-all"
              style={{ height: `${(v / 100) * 100}%`, opacity: i === data.length - 1 ? 1 : 0.6 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[6px] mt-1">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[7px] text-[var(--text-dim)]">{l}</div>
        ))}
      </div>
    </div>
  );
}

export default function ValidatorDashboard() {
  const [logs] = useState(generateValidationLog);
  const [uptime, setUptime] = useState(99.97);

  useEffect(() => {
    const id = setInterval(() => {
      setUptime((p) => Math.max(99.9, Math.min(100, p + (Math.random() - 0.3) * 0.01)));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold">VALIDATOR_DASHBOARD</h1>
            <TruvaStatusPill variant="online" />
          </div>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">NODE_001 · SOLANA_MAINNET · EPOCH_412</p>
        </div>
        <TruvaButton variant="outlined" className="text-[12px]">VALIDATOR_SETTINGS</TruvaButton>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <TruvaStatCard label="BLOCKS_VALIDATED" value="8,924" sub="THIS EPOCH" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="REWARDS_EARNED" value="2,450 TRU" sub="↑ 12% vs LAST EPOCH" icon={<Award size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="UPTIME" value={`${uptime.toFixed(2)}%`} sub="LAST 30 DAYS" icon={<TrendingUp size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="STAKE_LOCKED" value="1.2M TRU" sub="UNTIL EPOCH 500" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-6 mb-6">
        {/* Validation Log */}
        <TruvaTerminal
          title="VALIDATION_LOG"
          lines={logs}
          showCursor
          maxHeight="300px"
        />

        {/* Reward Trajectory */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">REWARD_TRAJECTORY</h3>
          <RewardChart />
          <div className="flex justify-between text-[13px] mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)]">12-EPOCH TREND</span>
            <span className="text-[var(--accent-green)] font-bold">↑ 38.4%</span>
          </div>
        </div>
      </div>

      {/* System Telemetry + Alerts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">SYSTEM_TELEMETRY</h3>
          <div className="space-y-3">
            {[
              { label: 'CPU_USAGE', value: 34, icon: <Cpu size={14} />, color: 'var(--accent-green)' },
              { label: 'MEMORY', value: 62, icon: <Server size={14} />, color: 'var(--accent-green)' },
              { label: 'DISK_I/O', value: 18, icon: <HardDrive size={14} />, color: 'var(--accent-green)' },
              { label: 'NETWORK_BW', value: 45, icon: <Zap size={14} />, color: 'var(--accent-green)' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">{m.icon}</span>
                    {m.label}
                  </div>
                  <span style={{ color: m.color }}>{m.value}%</span>
                </div>
                <TruvaProgressBar value={m.value} color={m.color} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Alert 1 */}
          <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-[var(--accent-green)] mt-0.5 shrink-0" />
              <div>
                <div className="text-[13px] font-bold text-[var(--accent-green)]">ALL SYSTEMS NOMINAL</div>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  Validator node operating within normal parameters. No anomalies detected in the last 24 hours.
                </p>
              </div>
            </div>
          </div>
          {/* Alert 2 */}
          <div className="bg-[var(--bg-card)] border border-[var(--amber)] rounded-[2px] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[var(--amber)] mt-0.5 shrink-0" />
              <div>
                <div className="text-[13px] font-bold text-[var(--amber)]">EPOCH TRANSITION PENDING</div>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  Epoch 413 begins in ~2h 14m. Ensure stake delegation is confirmed before transition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: 'ZK_PROOF_ENGINE', desc: 'Zero-knowledge proof generation for transaction privacy and compliance verification.', icon: <ShieldCheck size={18} /> },
          { title: 'CONSENSUS_MODULE', desc: 'Byzantine fault-tolerant consensus with sub-second finality guarantees.', icon: <Server size={18} /> },
          { title: 'REWARD_OPTIMIZER', desc: 'Automated stake rebalancing for maximum yield across validation epochs.', icon: <TrendingUp size={18} /> },
        ].map((f) => (
          <div key={f.title} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <div className="text-[var(--accent-green)] mb-3">{f.icon}</div>
            <h4 className="text-[12px] font-bold mb-2">{f.title}</h4>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
