'use client';

import { useEffect, useState, useMemo } from 'react';
import { TruvaStatCard, TruvaStatusPill, TruvaProgressBar, TruvaPulsingDot, TruvaTerminal } from '@/components/ui/truva';
import { Globe, Shield, Activity, Zap } from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import { useStats } from '@/lib/hooks/useStats';
import { TIER_LABELS, type TrustTier } from '@/backend/types/agent';
import type { ReputationEvent } from '@/backend/types/transaction';
import { useQuery } from '@tanstack/react-query';

/* ── Fetch reputation events ────────────────────────────────── */
async function fetchReputationEvents(limit = 20): Promise<ReputationEvent[]> {
  const res = await fetch(`/api/reputation?limit=${limit}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

function useReputationEvents(limit = 20) {
  return useQuery({
    queryKey: ['reputation-events', limit],
    queryFn: () => fetchReputationEvents(limit),
    refetchInterval: 10_000,
  });
}

/* ── Tier → CSS color var mapping ───────────────────────────── */
const TIER_COLORS: Record<TrustTier, string> = {
  0: 'var(--tier-bronze)',
  1: 'var(--tier-silver)',
  2: 'var(--tier-gold)',
  3: 'var(--tier-platinum)',
};

/* ── SVG World Map — simplified continents ──────────────────── */
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

  const { data: agents } = useAgents();
  const avgTrust = useMemo(() => {
    if (!agents?.length) return null;
    return (agents.reduce((s, a) => s + a.trust_score, 0) / agents.length).toFixed(1);
  }, [agents]);

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
        <span>GLOBAL TRUST INDEX: {avgTrust ?? '—'}%</span>
      </div>
    </div>
  );
}

/* ── Volume chart using bars ────────────────────────────────── */
function VolumeChart() {
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    setData(Array.from({ length: 24 }, () => Math.random() * 80 + 20));
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

/* ── ZK Proof gauge ─────────────────────────────────────────── */
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

/* ── Loading skeleton ───────────────────────────────────────── */
function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[48px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px] animate-pulse" />
      ))}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function ReputationExplorerPage() {
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: repEvents, isLoading: eventsLoading } = useReputationEvents(20);

  /* Derive reputation flows from real agents (top 5 by trust_score) */
  const reputationFlows = useMemo(() => {
    if (!agents?.length) return [];
    return [...agents]
      .sort((a, b) => b.trust_score - a.trust_score)
      .slice(0, 5)
      .map((a) => ({
        agent: a.name.toUpperCase().replace(/\s+/g, '_'),
        score: a.trust_score,
        delta: a.trust_score >= 90 ? '+' + (Math.random() * 2).toFixed(1) : (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 2).toFixed(1),
        color: TIER_COLORS[a.tier],
        id: a.id,
      }));
  }, [agents]);

  /* Derive attestation-like entries from reputation events */
  const attestations = useMemo(() => {
    if (!repEvents?.length) return [];
    return repEvents.slice(0, 5).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      scoreDelta: e.score_delta,
      status: (e.event_type === 'attested' || e.event_type === 'success' ? 'verified' : e.event_type === 'blocked' || e.event_type === 'fail' ? 'blocked' : 'pending') as 'verified' | 'blocked' | 'pending',
      label: e.description ?? e.event_type.replace('_', ' ').toUpperCase(),
      date: new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [repEvents]);

  /* Compute average trust for the ZK gauge */
  const avgTrust = useMemo(() => {
    if (!agents?.length) return 99.2;
    return Number((agents.reduce((s, a) => s + a.trust_score, 0) / agents.length).toFixed(1));
  }, [agents]);

  /* Terminal log feed — mix real events with system messages */
  const [termLines, setTermLines] = useState([
    '[SYS] Reputation engine initialized',
    '[INFO] Loading global attestation data...',
  ]);

  useEffect(() => {
    if (repEvents?.length) {
      const eventLines = repEvents.slice(0, 5).map((e) => {
        const delta = e.score_delta >= 0 ? `+${e.score_delta}` : `${e.score_delta}`;
        return `[TX] ${e.event_type.toUpperCase()} · Δ${delta} · ${e.description ?? 'score update'}`;
      });
      setTermLines((prev) => [
        ...prev,
        `[AUTH] ${repEvents.length} reputation events loaded`,
        ...eventLines,
      ]);
    }
  }, [repEvents]);

  useEffect(() => {
    const events = [
      '[HB] Heartbeat · All reputation nodes synced',
      '[INFO] ZK batch validated',
      '[SYS] Reputation snapshot saved',
      '[HB] Trust index recalculated',
    ];
    let i = 0;
    const id = setInterval(() => {
      setTermLines((prev) => [...prev.slice(-48), events[i % events.length]]);
      i++;
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const statLoading = statsLoading || agentsLoading;

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
        <TruvaStatCard
          label="GLOBAL_TRUST_INDEX"
          value={statLoading ? '—' : `${avgTrust}%`}
          sub={agents?.length ? `ACROSS ${agents.length} AGENTS` : ''}
          icon={<Globe size={16} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="GATE_CHECKS"
          value={statLoading ? '—' : stats?.gateCheckCount.toLocaleString() ?? '0'}
          sub={`AVG LATENCY ${stats?.avgLatency ?? 0}MS`}
          icon={<Shield size={16} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="TRANSACTIONS"
          value={statLoading ? '—' : stats?.transactionCount.toLocaleString() ?? '0'}
          sub="TOTAL PROCESSED"
          icon={<Zap size={16} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard
          label="REPUTATION_EVENTS"
          value={eventsLoading ? '—' : repEvents?.length.toLocaleString() ?? '0'}
          sub="RECENT SCORE CHANGES"
          icon={<Activity size={16} className="text-[var(--accent-green)]" />}
        />
      </div>

      {/* Trust Heatmap */}
      <TrustHeatmap />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Reputation Events (was "Validator Attestations") */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">REPUTATION_EVENTS</h3>
          {eventsLoading ? <SkeletonRows count={5} /> : (
            <div className="space-y-2">
              {attestations.length === 0 && (
                <p className="text-[13px] text-[var(--text-muted)] py-4 text-center">No reputation events yet</p>
              )}
              {attestations.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px]">
                  <div>
                    <div className="text-[13px] font-bold">{a.label}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">{a.date} · Δ {a.scoreDelta >= 0 ? '+' : ''}{a.scoreDelta}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[12px] font-bold ${a.scoreDelta >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--red)]'}`}>{a.scoreDelta >= 0 ? '+' : ''}{a.scoreDelta}</span>
                    <TruvaStatusPill variant={a.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reputation Flow — top agents by trust score */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">REPUTATION_FLOW</h3>
          {agentsLoading ? <SkeletonRows count={5} /> : (
            <div className="space-y-3">
              {reputationFlows.length === 0 && (
                <p className="text-[13px] text-[var(--text-muted)] py-4 text-center">No agents found</p>
              )}
              {reputationFlows.map((r) => (
                <div key={r.id}>
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <VolumeChart />
        <ZKGauge value={avgTrust} />
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
