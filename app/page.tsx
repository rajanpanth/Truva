'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TruvaButton, TruvaStatusPill, TruvaProgressBar, TruvaPulsingDot, TruvaInput } from '@/components/ui/truva';
import { Shield, CheckCircle, Zap } from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import { useStats } from '@/lib/hooks/useStats';
import { TIER_LABELS } from '@/backend/types/agent';
import type { Agent } from '@/backend/types/agent';
import type { TrustGateLog } from '@/backend/types/trustgate';

/* ─── Animated bar chart ─── */
function LiveBarChart() {
  const [bars, setBars] = useState<number[]>([]);
  useEffect(() => {
    setBars(Array.from({ length: 18 }, () => Math.random() * 80 + 20));
    const id = setInterval(() => {
      setBars((prev) => prev.map((_, i) => {
        const base = Math.sin(Date.now() / 1000 + i * 0.5) * 30 + 50;
        return Math.max(10, Math.min(100, base + Math.random() * 20));
      }));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4">
      <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] mb-3">FREESPOT_REGISTER</div>
      <div className="flex items-end gap-[3px] h-[140px]">
        {(bars.length > 0 ? bars : Array.from({ length: 18 }, () => 50)).map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--accent-green)] rounded-[1px] transition-all duration-500"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between items-center mt-3 text-[13px] uppercase tracking-[2px]">
        <span className="text-[var(--text-muted)]">00:00:00</span>
        <span className="text-[var(--accent-green)]">LIVE_TX_FEED</span>
        <span className="text-[var(--text-secondary)]">4.2k TPS</span>
      </div>
    </div>
  );
}

const tierColors: Record<string, string> = {
  Gold: 'var(--tier-gold)',
  Silver: 'var(--tier-silver)', Bronze: 'var(--tier-bronze)',
};

const tiers = [
  { name: 'BRONZE', desc: 'Low-trust operations. Up to 5 SOL per transaction.', color: 'var(--tier-bronze)' },
  { name: 'SILVER', desc: 'Standard operations. Up to 100 SOL per transaction.', color: 'var(--tier-silver)' },
  { name: 'GOLD', desc: 'High-trust operations. Unlimited transaction size.', color: 'var(--tier-gold)' },
];

export default function LandingPage() {
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formCategory, setFormCategory] = useState('FINANCIAL_ARBITRAGE');

  const { data: agentsData = [], isLoading: agentsLoading } = useAgents({});
  const { data: logsData } = useTrustGateLogs({ limit: 3 });
  const { data: stats } = useStats();
  const logRows: TrustGateLog[] = logsData?.data ?? [];
  const displayAgents = agentsData.slice(0, 4);

  /* ─── Waitlist state ─── */
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistRole, setWaitlistRole] = useState('DEVELOPER');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [waitlistMsg, setWaitlistMsg] = useState('');
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);

  useEffect(() => {
    fetch('/api/waitlist').then(r => r.json()).then(d => {
      if (d.success) setWaitlistCount(d.data.count);
    }).catch(() => {});
  }, []);

  const handleWaitlistSubmit = async () => {
    if (!waitlistEmail) return;
    setWaitlistStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail, role: waitlistRole }),
      });
      const data = await res.json();
      if (data.success) {
        setWaitlistStatus('success');
        setWaitlistPosition(data.data.position);
        setWaitlistCount(data.data.position);
        setWaitlistMsg(`POSITION_ASSIGNED: #${String(data.data.position).padStart(4, '0')}`);
      } else {
        setWaitlistStatus('error');
        setWaitlistMsg(data.error === 'Already on the waitlist' ? 'DUPLICATE_ENTRY_DETECTED' : data.error?.toUpperCase() || 'SUBMISSION_FAILED');
      }
    } catch {
      setWaitlistStatus('error');
      setWaitlistMsg('NETWORK_ERROR — RETRY_LATER');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* TOPBAR */}
      <header className="sticky top-0 z-50 h-12 bg-[var(--bg-base)] border-b border-[var(--border-default)] flex items-center px-6">
        <Link href="/" className="flex items-center mr-8">
          <img src="/assets/logo/truva-logo.png" alt="TRUVA" className="site-logo" />
        </Link>
        <nav className="hidden md:flex items-center gap-5 flex-1">
          {['PROTOCOL', 'ORACLES', 'LEDGER', 'SECURITY'].map((item, i) => (
            <span
              key={item}
              className={`text-[13px] uppercase tracking-[2px] ${i === 0 ? 'text-[var(--accent-green)] border-b-2 border-[var(--accent-green)] pb-0.5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer'}`}
            >
              {item}
            </span>
          ))}
        </nav>
        <Link href="/registry">
          <TruvaButton variant="outlined" className="text-[12px] px-3 py-1.5">TERMINAL_ACCESS</TruvaButton>
        </Link>
      </header>

      {/* HERO */}
      <section className="px-4 sm:px-8 pt-12 pb-20">
        <div className="flex items-center gap-1.5 mb-6">
          <TruvaPulsingDot size={6} />
          <span className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)]">SYSTEM_STATUS: OPERATIONAL</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-10 items-start">
          <div>
            <h1 className="text-[28px] sm:text-[40px] lg:text-[52px] font-extrabold leading-[1.05] tracking-tight">
              THE TRUST GATE<br />
              FOR <span className="text-[var(--accent-green)]">AI AGENT</span><br />
              PAYMENTS
            </h1>
            <p className="mt-5 text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-[480px]">
              Deterministic compliance and security infrastructure for autonomous financial operations. Validating every machine-to-machine transaction in real-time.
            </p>
            <div className="flex gap-3 mt-7">
              <Link href="/waitlist"><TruvaButton variant="primary">GET_EARLY_ACCESS</TruvaButton></Link>
              <Link href="/registry"><TruvaButton variant="outlined">INITIATE_PROTOCOL</TruvaButton></Link>
            </div>
          </div>
          <LiveBarChart />
        </div>
      </section>

      {/* TRUSTGATE REAL-TIME LOGS */}
      <section className="px-4 sm:px-8 py-10 border-t border-[var(--border-default)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <TruvaPulsingDot size={5} />
            <span className="text-[13px] uppercase tracking-[2px] text-[var(--text-primary)] font-bold">TRUSTGATE_REAL_TIME_LOGS</span>
          </div>
          <span className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">ACTIVE_FILTERS: ALL &nbsp; LOG_BUFFER: 51240</span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['TIMESTAMP', 'AGENT_ID', 'TRANSACTION_HASH', 'STATUS', 'LATENCY'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logRows.map((r: TrustGateLog, i: number) => (
              <tr key={r.id ?? i} className="border-b border-[var(--border-subtle)] h-[44px] hover:bg-[var(--bg-card)]">
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-muted)]">{new Date(r.created_at).toISOString().substring(0, 19).replace('T', ' ')}</td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--accent-green)]">{r.agent_name ?? r.agent_id?.slice(0, 12)}</td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">{r.action}</td>
                <td className="px-4 py-2.5"><TruvaStatusPill variant={r.status} /></td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* AGENT REGISTRY */}
      <section className="px-4 sm:px-8 py-12 border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[24px] font-bold">AGENT_REGISTRY</h2>
            <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">VERIFIED_AUTONOMOUS_ENTITIES_V2.0.0</p>
          </div>
          <div className="relative">
            <input placeholder="FILTER_BY_HASH_OR_NAME" className="pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] w-full sm:w-[260px] focus:border-[var(--accent-green)] focus:outline-none" />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agentsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] animate-pulse" />
              ))
            : displayAgents.map((a: Agent) => {
                const tierName = TIER_LABELS[a.tier];
                return (
                  <div key={a.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[var(--border-default)] rounded-[2px] flex items-center justify-center">
                          <Shield size={14} className="text-[var(--text-muted)]" />
                        </div>
                        <div>
                          <div className="text-[12px] font-bold">{a.name}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">ID: {a.public_key.slice(0, 10)}...</div>
                        </div>
                      </div>
                      <TruvaStatusPill variant={tierName.toLowerCase() as 'gold' | 'silver' | 'bronze'} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-1">
                      <span>TRUST SCORE</span>
                      <span style={{ color: tierColors[tierName] }}>{a.trust_score}%</span>
                    </div>
                    <TruvaProgressBar value={a.trust_score} color={tierColors[tierName]} />
                    <Link href={`/agent/${a.id}`}>
                      <TruvaButton variant="ghost" className="w-full mt-3 text-[12px]">VIEW_PASSPORT</TruvaButton>
                    </Link>
                  </div>
                );
              })}
        </div>
      </section>

      {/* TRADEBOT X PASSPORT */}
      <section className="px-4 sm:px-8 py-12 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={24} className="text-[var(--accent-green)]" />
          <h2 className="text-[22px] font-bold">TRADEBOT X PASSPORT</h2>
        </div>
        <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-6">REPUTATION_STAMP_ID: AF-9283-TR-001</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'RELIABILITY', val: '99.98', unit: '%', pct: 99.98 },
            { label: 'LATENCY_AVG', val: '4.2', unit: 'ms', pct: 15 },
            { label: 'COMPLIANCE', val: '100', unit: '%', pct: 100 },
          ].map((m) => (
            <div key={m.label} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4">
              <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">{m.label}</div>
              <div className="text-[28px] font-bold">{m.val}<span className="text-[16px]">{m.unit}</span></div>
              <TruvaProgressBar value={m.pct} className="mt-2" />
            </div>
          ))}
          <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-4 flex flex-col items-center justify-center text-center">
            <Shield size={28} className="text-[var(--accent-green)] mb-2" />
            <div className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)] italic mb-1">STAKED_REPUTATION</div>
            <div className="text-[22px] font-bold">500,000 TRU</div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-primary)] font-bold mb-4">COMPLIANCE_MANIFESTO_V.2</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3 text-[12px]">
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">KYA_STATUS</span><span className="font-bold text-[var(--accent-green)]">VERIFIED</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">OPERATING_LIMIT</span><span className="font-bold">$10.0M DAILY</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">JURISDICTION</span><span className="font-bold">GLOBAL_MESH</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">LAST_AUDIT</span><span className="font-bold">2026-04-29</span></div>
          </div>
        </div>
      </section>

      {/* REGISTER YOUR AGENT */}
      <section className="px-4 sm:px-8 py-12 border-t border-[var(--border-default)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
          <div>
            <h2 className="text-[28px] font-extrabold mb-2">REGISTER_YOUR_AGENT</h2>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[440px]">
              Onboard your autonomous system to the Truva Protocol. Requires valid public keys and compliance documentation for tier assignment.
            </p>
            <div className="space-y-5">
              <TruvaInput label="AGENT_ENTITY_NAME" placeholder="e.g. ALPHA_LIQUIDITY_BOT" value={formName} onChange={(e) => setFormName(e.target.value)} />
              <TruvaInput label="PUBLIC_KEY_HEX [ED25519]" placeholder="0x..." value={formKey} onChange={(e) => setFormKey(e.target.value)} />
              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">DEPLOYMENT_CATEGORY</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-2.5 text-[13px] text-[var(--text-primary)] font-mono focus:border-[var(--accent-green)] focus:outline-none appearance-none cursor-pointer">
                  <option>FINANCIAL_ARBITRAGE</option>
                  <option>DATA_ORACLE</option>
                  <option>SECURITY_MONITOR</option>
                  <option>TRADING_BOT</option>
                </select>
              </div>
              <TruvaButton variant="primary" className="w-full mt-2">INITIATE_ONBOARDING_SEQUENCE</TruvaButton>
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-primary)] font-bold mb-5">TIER_PROGRESSION</div>
            <div className="space-y-4">
              {tiers.map((t) => (
                <div key={t.name} className="flex items-start gap-3">
                  <CheckCircle size={16} style={{ color: t.color }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[12px] font-bold" style={{ color: t.color }}>{t.name}</div>
                    <div className="text-[13px] text-[var(--text-muted)]">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px]">
              <p className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)] leading-relaxed">
                NOTE: ALL REGISTRATION REQUESTS ARE SUBJECT TO A 24-CYCLE VALIDATION PERIOD BY THE TRUVA CONSENSUS ENGINE.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ACCESS WAITLIST */}
      <section className="px-4 sm:px-8 py-16 border-t border-[var(--border-default)]">
        <div className="max-w-[680px] mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap size={18} className="text-[var(--accent-green)]" />
            <span className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)] font-bold">EARLY_ACCESS_PROTOCOL</span>
          </div>
          <h2 className="text-[28px] sm:text-[36px] font-extrabold leading-tight mb-3">
            JOIN THE TRUST<br />INFRASTRUCTURE
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[440px] mx-auto">
            Get early access to the Truva SDK and be among the first protocols to trust-gate AI agent payments on Solana.
          </p>

          {waitlistStatus === 'success' ? (
            <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-6 text-left">
              <div className="flex items-center gap-2 mb-3">
                <TruvaPulsingDot size={6} />
                <span className="text-[13px] uppercase tracking-[2px] text-[var(--accent-green)] font-bold">ACCESS_QUEUED</span>
              </div>
              <div className="bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px] p-4 font-mono text-[13px]">
                <div className="text-[var(--text-muted)]">$ truva waitlist --status</div>
                <div className="text-[var(--accent-green)] mt-1">{waitlistMsg}</div>
                <div className="text-[var(--text-secondary)] mt-1">QUEUE_DEPTH: {waitlistCount} OPERATORS</div>
                <div className="text-[var(--text-muted)] mt-1">ETA: MAINNET_LAUNCH_Q3_2026</div>
                <span className="inline-block w-2 h-4 bg-[var(--accent-green)] animate-terminal-blink mt-1" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="OPERATOR_EMAIL@DOMAIN.COM"
                  value={waitlistEmail}
                  onChange={(e) => { setWaitlistEmail(e.target.value); setWaitlistStatus('idle'); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleWaitlistSubmit()}
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-4 py-3 text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-green)] focus:outline-none"
                />
                <select
                  value={waitlistRole}
                  onChange={(e) => setWaitlistRole(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-3 text-[13px] text-[var(--text-primary)] font-mono focus:border-[var(--accent-green)] focus:outline-none appearance-none cursor-pointer sm:w-[200px]"
                >
                  <option>DEVELOPER</option>
                  <option>PROTOCOL_TEAM</option>
                  <option>AGENT_OPERATOR</option>
                  <option>INVESTOR</option>
                </select>
              </div>
              <TruvaButton
                variant="primary"
                className="w-full sm:w-auto px-10 py-3"
                onClick={handleWaitlistSubmit}
                disabled={waitlistStatus === 'loading'}
              >
                {waitlistStatus === 'loading' ? 'PROCESSING...' : 'REQUEST_EARLY_ACCESS'}
              </TruvaButton>

              {waitlistStatus === 'error' && (
                <div className="text-[13px] uppercase tracking-[2px] text-[var(--red)]">
                  ⚠ {waitlistMsg}
                </div>
              )}

              {waitlistCount > 0 && (
                <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-muted)] mt-2">
                  {waitlistCount} OPERATOR{waitlistCount !== 1 ? 'S' : ''} IN QUEUE
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 sm:px-8 py-6 border-t border-[var(--border-default)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-[12px] font-bold">TRUVA PROTOCOL</div>
            <div className="text-[12px] text-[var(--text-muted)] mt-1">© 2026 TRUVA PROTOCOL · SYSTEM_STATUS: OPERATIONAL</div>
          </div>
          <div className="flex gap-5">
            {['DOCUMENTATION', 'AGENT_REGISTRY', 'VALIDATION_LOG', 'PRIVACY'].map((link) => (
              <span key={link} className="text-[12px] uppercase tracking-[2px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">{link}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
