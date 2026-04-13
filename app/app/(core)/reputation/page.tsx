'use client';

import { useEffect, useState } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaProgressBar, TruvaPulsingDot, TruvaTerminal } from '@/components/ui/truva';
import { Globe, Shield, Activity, Zap } from 'lucide-react';

/* SVG World Map — simplified continents */
function TrustHeatmap() {
  const [hotspots, setHotspots] = useState([
    { cx: 150, cy: 100, r: 6, label: 'NA', opacity: 0.9 },
    { cx: 310, cy: 95, r: 5, label: 'EU', opacity: 0.8 },
    { cx: 350, cy: 130, r: 4, label: 'ME', opacity: 0.5 },
    { cx: 420, cy: 110, r: 5, label: 'AS', opacity: 0.7 },
    { cx: 470, cy: 100, r: 6, label: 'EA', opacity: 0.95 },
    { cx: 200, cy: 170, r: 3, label: 'SA', opacity: 0.4 },
    { cx: 330, cy: 180, r: 3, label: 'AF', opacity: 0.3 },
    { cx: 480, cy: 190, r: 4, label: 'OC', opacity: 0.6 },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setHotspots((prev) => prev.map((h) => ({
        ...h,
        opacity: Math.max(0.2, Math.min(1, h.opacity + (Math.random() - 0.5) * 0.15)),
        r: Math.max(2, Math.min(8, h.r + (Math.random() - 0.5) * 0.8)),
      })));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-[var(--accent-green)]" />
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold">TRUST_HEATMAP</h3>
        </div>
        <div className="flex items-center gap-2">
          <TruvaPulsingDot size={5} />
          <span className="text-[12px] text-[var(--accent-green)] uppercase tracking-[2px]">LIVE</span>
        </div>
      </div>
      <svg viewBox="0 0 600 250" className="w-full h-[200px]">
        {/* Grid lines */}
        {[50, 100, 150, 200].map((y) => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="var(--border-subtle)" strokeWidth="0.5" />
        ))}
        {[100, 200, 300, 400, 500].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="250" stroke="var(--border-subtle)" strokeWidth="0.5" />
        ))}
        {/* Simplified continent outlines */}
        <path d="M120,60 Q140,50 170,55 L180,70 Q185,90 175,110 L155,120 Q130,115 120,100 Z" fill="none" stroke="var(--border-default)" strokeWidth="1" />
        <path d="M195,130 Q210,125 220,140 L215,180 Q200,190 190,175 Z" fill="none" stroke="var(--border-default)" strokeWidth="1" />
        <path d="M290,70 Q320,60 350,65 L355,85 Q340,100 310,95 L295,85 Z" fill="none" stroke="var(--border-default)" strokeWidth="1" />
        <path d="M320,110 Q340,105 355,120 L350,160 Q335,175 320,165 L315,130 Z" fill="none" stroke="var(--border-default)" strokeWidth="1" />
        <path d="M390,70 Q430,55 480,65 L490,100 Q485,120 460,125 L420,120 Q395,105 390,85 Z" fill="none" stroke="var(--border-default)" strokeWidth="1" />
        <path d="M460,170 Q480,160 500,170 L495,195 Q475,200 460,190 Z" fill="none" stroke="var(--border-default)" strokeWidth="1" />
        {/* Hotspot dots */}
        {hotspots.map((h, i) => (
          <g key={i}>
            <circle cx={h.cx} cy={h.cy} r={h.r * 3} fill="var(--accent-green)" opacity={h.opacity * 0.1} />
            <circle cx={h.cx} cy={h.cy} r={h.r * 1.5} fill="var(--accent-green)" opacity={h.opacity * 0.25} />
            <circle cx={h.cx} cy={h.cy} r={h.r} fill="var(--accent-green)" opacity={h.opacity} />
            <text x={h.cx} y={h.cy - h.r - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="monospace">{h.label}</text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[12px] text-[var(--text-muted)] mt-2">
        <span>8 ACTIVE REGIONS</span>
        <span>GLOBAL TRUST INDEX: 94.2%</span>
      </div>
    </div>
  );
}

/* Volume chart using bars */
function VolumeChart() {
  const [data, setData] = useState(Array.from({ length: 24 }, () => Math.random() * 80 + 20));

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => [...prev.slice(1), Math.random() * 80 + 20]);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
      <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">TX_VOLUME_24H</h3>
      <div className="flex items-end gap-[2px] h-[100px]">
        {data.map((v, i) => (
          <div key={i} className="flex-1 bg-[var(--accent-green)] rounded-[1px]" style={{ height: `${v}%`, opacity: i === data.length - 1 ? 1 : 0.5 }} />
        ))}
      </div>
      <div className="flex justify-between text-[12px] text-[var(--text-muted)] mt-2">
        <span>24H AGO</span>
        <span>NOW</span>
      </div>
    </div>
  );
}

/* ZK Proof gauge */
function ZKGauge({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 flex flex-col items-center">
      <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3 self-start">ZK_PROOF_VALIDITY</h3>
      <svg viewBox="0 0 100 100" className="w-[100px] h-[100px]">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-default)" strokeWidth="4" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-green)" strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)" />
        <text x="50" y="46" textAnchor="middle" fill="var(--accent-green)" fontSize="18" fontFamily="monospace" fontWeight="bold">{value}%</text>
        <text x="50" y="60" textAnchor="middle" fill="var(--text-muted)" fontSize="6" fontFamily="monospace">VERIFIED</text>
      </svg>
    </div>
  );
}

const attestations = [
  { validator: 'VAL_NODE_001', epoch: '412', score: 99.8, status: 'verified' as const },
  { validator: 'VAL_NODE_007', epoch: '412', score: 94.2, status: 'verified' as const },
  { validator: 'VAL_NODE_012', epoch: '411', score: 88.5, status: 'verified' as const },
  { validator: 'VAL_NODE_003', epoch: '411', score: 62.1, status: 'pending' as const },
  { validator: 'VAL_NODE_019', epoch: '410', score: 91.7, status: 'verified' as const },
];

const reputationFlows = [
  { agent: 'TRADEBOT_X', score: 99.8, delta: '+0.3', color: 'var(--tier-platinum)' },
  { agent: 'LIQUID_FLOW', score: 94.2, delta: '+1.1', color: 'var(--tier-gold)' },
  { agent: 'ORACLE_EYE', score: 88.5, delta: '-0.4', color: 'var(--tier-silver)' },
  { agent: 'GUARD_PROTO', score: 62.1, delta: '+2.8', color: 'var(--tier-bronze)' },
  { agent: 'NEXUS_BRIDGE', score: 91.7, delta: '+0.7', color: 'var(--tier-gold)' },
];

export default function ReputationExplorerPage() {
  const [termLines, setTermLines] = useState([
    '[SYS] Reputation engine initialized',
    '[INFO] Loading global attestation data...',
    '[AUTH] 5 validator attestations loaded',
    '[TX] Trust score recalculation · Epoch 412',
  ]);

  useEffect(() => {
    const events = [
      '[HB] Heartbeat · All reputation nodes synced',
      '[TX] Score update: TRADEBOT_X → 99.8 (+0.01)',
      '[AUTH] Attestation confirmed · VAL_NODE_001',
      '[INFO] ZK batch validated · 12 proofs',
      '[SYS] Reputation snapshot saved',
    ];
    let i = 0;
    const id = setInterval(() => {
      setTermLines((prev) => [...prev.slice(-48), events[i % events.length]]);
      i++;
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold">REPUTATION_EXPLORER</h1>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">GLOBAL TRUST TOPOLOGY · LIVE_FEED</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TruvaStatCard label="GLOBAL_TRUST_INDEX" value="94.2%" sub="↑ 1.2% THIS EPOCH" icon={<Globe size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ATTESTATIONS" value="5,204" sub="ACROSS 19 VALIDATORS" icon={<Shield size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ZK_PROOFS_VERIFIED" value="12,847" sub="LAST 24H" icon={<Zap size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="REPUTATION_EVENTS" value="847" sub="SCORE CHANGES TODAY" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
      </div>

      {/* Trust Heatmap */}
      <TrustHeatmap />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Validator Score Attestations */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">VALIDATOR_ATTESTATIONS</h3>
          <div className="space-y-2">
            {attestations.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px]">
                <div>
                  <div className="text-[13px] font-bold">{a.validator}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">EPOCH {a.epoch}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold">{a.score}</span>
                  <TruvaStatusPill variant={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reputation Flow */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">REPUTATION_FLOW</h3>
          <div className="space-y-3">
            {reputationFlows.map((r) => (
              <div key={r.agent}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-[var(--text-secondary)]">{r.agent}</span>
                  <div className="flex items-center gap-2">
                    <span className={r.delta.startsWith('+') ? 'text-[var(--accent-green)]' : 'text-[var(--red)]'}>{r.delta}</span>
                    <span className="font-bold" style={{ color: r.color }}>{r.score}</span>
                  </div>
                </div>
                <TruvaProgressBar value={r.score} color={r.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <VolumeChart />
        <ZKGauge value={99.2} />
      </div>

      {/* Realtime Logs */}
      <div className="mt-6">
        <TruvaTerminal
          title="REPUTATION_ENGINE_LOG"
          lines={termLines}
          showCursor
          maxHeight="200px"
        />
      </div>
    </div>
  );
}
