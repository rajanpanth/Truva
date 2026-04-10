'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TruvaButton, TruvaStatusPill, TruvaProgressBar, TruvaPulsingDot, TruvaInput } from '@/components/ui/truva';
import { Shield, CheckCircle } from 'lucide-react';

/* ─── Animated bar chart ─── */
function LiveBarChart() {
  const [bars, setBars] = useState<number[]>(Array.from({ length: 18 }, () => Math.random() * 80 + 20));
  useEffect(() => {
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
      <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-muted)] mb-3">FREESPOT_REGISTER</div>
      <div className="flex items-end gap-[3px] h-[140px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--accent-green)] rounded-[1px] transition-all duration-500"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between items-center mt-3 text-[10px] uppercase tracking-[2px]">
        <span className="text-[var(--text-muted)]">00:00:00</span>
        <span className="text-[var(--accent-green)]">LIVE_TX_FEED</span>
        <span className="text-[var(--text-secondary)]">4.2k TPS</span>
      </div>
    </div>
  );
}

const logRows = [
  { ts: '2024-05-24T32:04:012', agent: 'TRD_BOT_X_69', hash: 'hx72n...Fb09', status: 'passed' as const, latency: '12ms' },
  { ts: '2024-05-24T32:03:552', agent: 'ARB_SCAN_4', hash: 'mw33n...e0a1', status: 'blocked' as const, latency: '45ms' },
  { ts: '2024-05-24T12:03:522', agent: 'SENT_ANALYTICS', hash: 'p00x2...x01D', status: 'passed' as const, latency: '8ms' },
];

const agents = [
  { name: 'TRADEBOT X', id: '0xAF2...FFC2', tier: 'platinum' as const, score: 99.8 },
  { name: 'LIQUID_FLOW', id: '0x9h6...CA29', tier: 'gold' as const, score: 94.2 },
  { name: 'ORACLE_EYE', id: '0xB412...1000', tier: 'silver' as const, score: 88.5 },
  { name: 'GUARD_PROTO', id: '0x8483...9F5D', tier: 'bronze' as const, score: 62.1 },
];

const tierColors: Record<string, string> = {
  platinum: 'var(--tier-platinum)', gold: 'var(--tier-gold)',
  silver: 'var(--tier-silver)', bronze: 'var(--tier-bronze)',
};

const tiers = [
  { name: 'SANDBOX_ACCESS', desc: 'Testnet operations only.', color: 'var(--text-muted)' },
  { name: 'MAINNET_BRONZE', desc: 'For Low-Trust Trading.', color: 'var(--tier-bronze)' },
  { name: 'MAINNET_SILVER', desc: 'Key-Value Verification.', color: 'var(--tier-silver)' },
  { name: 'ELITE_PLATINUM', desc: 'For Ultra-Compliant Oracle Flows.', color: 'var(--tier-platinum)' },
];

export default function LandingPage() {
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formCategory, setFormCategory] = useState('FINANCIAL_ARBITRAGE');

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* TOPBAR */}
      <header className="sticky top-0 z-50 h-12 bg-[var(--bg-base)] border-b border-[var(--border-default)] flex items-center px-6">
        <Link href="/" className="flex items-center mr-8">
          <img src="/assets/logo/truva-logo.png" alt="TRUVA" className="site-logo" />
        </Link>
        <nav className="flex items-center gap-5 flex-1">
          {['PROTOCOL', 'ORACLES', 'LEDGER', 'SECURITY'].map((item, i) => (
            <span
              key={item}
              className={`text-[11px] uppercase tracking-[2px] ${i === 0 ? 'text-[var(--accent-green)] border-b-2 border-[var(--accent-green)] pb-0.5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer'}`}
            >
              {item}
            </span>
          ))}
        </nav>
        <Link href="/registry">
          <TruvaButton variant="outlined" className="text-[9px] px-3 py-1.5">TERMINAL_ACCESS</TruvaButton>
        </Link>
      </header>

      {/* HERO */}
      <section className="px-8 pt-12 pb-20">
        <div className="flex items-center gap-1.5 mb-6">
          <TruvaPulsingDot size={6} />
          <span className="text-[10px] uppercase tracking-[2px] text-[var(--accent-green)]">SYSTEM_STATUS: OPERATIONAL</span>
        </div>
        <div className="grid grid-cols-[55%_1fr] gap-10 items-start">
          <div>
            <h1 className="text-[52px] font-extrabold leading-[1.05] tracking-tight">
              THE TRUST GATE<br />
              FOR <span className="text-[var(--accent-green)]">AI AGENT</span><br />
              PAYMENTS
            </h1>
            <p className="mt-5 text-[13px] text-[var(--text-secondary)] leading-relaxed max-w-[480px]">
              Deterministic compliance and security infrastructure for autonomous financial operations. Validating every machine-to-machine transaction in real-time.
            </p>
            <div className="flex gap-3 mt-7">
              <Link href="/registry"><TruvaButton variant="primary">INITIATE_PROTOCOL</TruvaButton></Link>
              <Link href="/sdk-docs"><TruvaButton variant="outlined">VIEW_SPEC_V2.0</TruvaButton></Link>
            </div>
          </div>
          <LiveBarChart />
        </div>
      </section>

      {/* TRUSTGATE REAL-TIME LOGS */}
      <section className="px-8 py-10 border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TruvaPulsingDot size={5} />
            <span className="text-[11px] uppercase tracking-[2px] text-[var(--text-primary)] font-bold">TRUSTGATE_REAL_TIME_LOGS</span>
          </div>
          <span className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)]">ACTIVE_FILTERS: ALL &nbsp; LOG_BUFFER: 51240</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {['TIMESTAMP', 'AGENT_ID', 'TRANSACTION_HASH', 'STATUS', 'LATENCY'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[2px] text-[var(--text-muted)] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logRows.map((r, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)] h-[44px] hover:bg-[var(--bg-card)]">
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-muted)]">{r.ts}</td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--accent-green)]">{r.agent}</td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">{r.hash}</td>
                <td className="px-4 py-2.5"><TruvaStatusPill variant={r.status} /></td>
                <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">{r.latency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* AGENT REGISTRY */}
      <section className="px-8 py-12 border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[24px] font-bold">AGENT_REGISTRY</h2>
            <p className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">VERIFIED_AUTONOMOUS_ENTITIES_V1.0.4</p>
          </div>
          <div className="relative">
            <input placeholder="FILTER_BY_HASH_OR_NAME" className="pl-8 pr-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] text-[11px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] w-[260px] focus:border-[var(--accent-green)] focus:outline-none" />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {agents.map((a) => (
            <div key={a.name} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[var(--border-default)] rounded-[2px] flex items-center justify-center">
                    <Shield size={14} className="text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold">{a.name}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">ID: {a.id}</div>
                  </div>
                </div>
                <TruvaStatusPill variant={a.tier} />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-1">
                <span>TRUST SCORE</span>
                <span style={{ color: tierColors[a.tier] }}>{a.score}%</span>
              </div>
              <TruvaProgressBar value={a.score} color={tierColors[a.tier]} />
              <Link href={`/agent/${a.name.toLowerCase().replace(/[\s_]/g, '-')}`}>
                <TruvaButton variant="ghost" className="w-full mt-3 text-[9px]">VIEW_PASSPORT</TruvaButton>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* TRADEBOT X PASSPORT */}
      <section className="px-8 py-12 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-3 mb-1">
          <Shield size={24} className="text-[var(--accent-green)]" />
          <h2 className="text-[22px] font-bold">TRADEBOT X PASSPORT</h2>
        </div>
        <p className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-6">REPUTATION_STAMP_ID: AF-9283-TR-001</p>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'RELIABILITY', val: '99.98', unit: '%', pct: 99.98 },
            { label: 'LATENCY_AVG', val: '4.2', unit: 'ms', pct: 15 },
            { label: 'COMPLIANCE', val: '100', unit: '%', pct: 100 },
          ].map((m) => (
            <div key={m.label} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-4">
              <div className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-2">{m.label}</div>
              <div className="text-[28px] font-bold">{m.val}<span className="text-[16px]">{m.unit}</span></div>
              <TruvaProgressBar value={m.pct} className="mt-2" />
            </div>
          ))}
          <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-4 flex flex-col items-center justify-center text-center">
            <Shield size={28} className="text-[var(--accent-green)] mb-2" />
            <div className="text-[10px] uppercase tracking-[2px] text-[var(--accent-green)] italic mb-1">STAKED_REPUTATION</div>
            <div className="text-[22px] font-bold">500,000 TRU</div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <div className="text-[11px] uppercase tracking-[2px] text-[var(--text-primary)] font-bold mb-4">COMPLIANCE_MANIFESTO_V.2</div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-[12px]">
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">KYA_STATUS</span><span className="font-bold text-[var(--accent-green)]">VERIFIED</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">OPERATING_LIMIT</span><span className="font-bold">$10.0M DAILY</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">JURISDICTION</span><span className="font-bold">GLOBAL_MESH</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-secondary)]">LAST_AUDIT</span><span className="font-bold">2024-05-23</span></div>
          </div>
        </div>
      </section>

      {/* REGISTER YOUR AGENT */}
      <section className="px-8 py-12 border-t border-[var(--border-default)]">
        <div className="grid grid-cols-[1fr_340px] gap-10">
          <div>
            <h2 className="text-[28px] font-extrabold mb-2">REGISTER_YOUR_AGENT</h2>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[440px]">
              Onboard your autonomous system to the Truva Protocol. Requires valid public keys and compliance documentation for tier assignment.
            </p>
            <div className="space-y-5">
              <TruvaInput label="AGENT_ENTITY_NAME" placeholder="e.g. ALPHA_LIQUIDITY_BOT" value={formName} onChange={(e) => setFormName(e.target.value)} />
              <TruvaInput label="PUBLIC_KEY_HEX [ED25519]" placeholder="0x..." value={formKey} onChange={(e) => setFormKey(e.target.value)} />
              <div>
                <label className="block mb-2 text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)]">DEPLOYMENT_CATEGORY</label>
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
            <div className="text-[11px] uppercase tracking-[2px] text-[var(--text-primary)] font-bold mb-5">TIER_PROGRESSION</div>
            <div className="space-y-4">
              {tiers.map((t) => (
                <div key={t.name} className="flex items-start gap-3">
                  <CheckCircle size={16} style={{ color: t.color }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[12px] font-bold" style={{ color: t.color }}>{t.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px]">
              <p className="text-[9px] uppercase tracking-[1px] text-[var(--text-muted)] leading-relaxed">
                NOTE: ALL REGISTRATION REQUESTS ARE SUBJECT TO A 24-CYCLE VALIDATION PERIOD BY THE TRUVA CONSENSUS ENGINE.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-6 border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-bold">TRUVA PROTOCOL</div>
            <div className="text-[9px] text-[var(--text-muted)] mt-1">© 2026 TRUVA PROTOCOL · SYSTEM_STATUS: OPERATIONAL</div>
          </div>
          <div className="flex gap-5">
            {['DOCUMENTATION', 'AGENT_REGISTRY', 'VALIDATION_LOG', 'PRIVACY'].map((link) => (
              <span key={link} className="text-[9px] uppercase tracking-[2px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">{link}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
