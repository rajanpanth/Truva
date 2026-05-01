'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TruvaButton, TruvaStatusPill, TruvaBadge, TruvaProgressBar,
  TruvaStatCard, TruvaPulsingDot, TruvaInput,
} from '@/components/ui/truva';
import {
  Shield, ArrowLeft, Terminal, Activity, BarChart3, Settings,
  Send, Pause, Play, ShieldOff, Save, X, AlertTriangle,
} from 'lucide-react';
import type { Agent } from '@/backend/types/agent';

/* ── Constants ── */
const TIER_BADGE: Record<number, 'bronze' | 'silver' | 'gold' | 'platinum'> = {
  0: 'bronze', 1: 'silver', 2: 'gold', 3: 'platinum',
};

const ACTION_TYPES = ['BUY', 'SELL', 'REBALANCE', 'GATE_CHECK'] as const;
const TOKEN_PAIRS = ['SOL/USDC', 'JUP/SOL', 'BONK/USDC', 'RAY/SOL', 'ORCA/USDC', 'PYTH/SOL'];
const STATUSES = ['CONFIRMED', 'PENDING', 'BLOCKED_BY_TRUST_GATE'] as const;

type ActionType = typeof ACTION_TYPES[number];
type ActionStatus = typeof STATUSES[number];

interface ActivityEntry {
  id: string;
  timestamp: string;
  action: ActionType;
  pair: string;
  amount: string;
  status: ActionStatus;
}

interface TerminalLine {
  sender: 'USER' | 'AGENT' | 'SYSTEM';
  text: string;
}

/* ── Helpers ── */
function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function randomEntry(): ActivityEntry {
  const action = ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)];
  const pair = TOKEN_PAIRS[Math.floor(Math.random() * TOKEN_PAIRS.length)];
  const amt = (Math.random() * 500 + 10).toFixed(2);
  // Weighted: 60% CONFIRMED, 25% PENDING, 15% BLOCKED
  const r = Math.random();
  const status: ActionStatus = r < 0.60 ? 'CONFIRMED' : r < 0.85 ? 'PENDING' : 'BLOCKED_BY_TRUST_GATE';
  return { id: crypto.randomUUID(), timestamp: ts(), action, pair, amount: `$${amt}`, status };
}

function seedEntries(n: number): ActivityEntry[] {
  return Array.from({ length: n }, () => randomEntry());
}

const statusColor: Record<ActionStatus, string> = {
  CONFIRMED: 'var(--accent-green)',
  PENDING: 'var(--amber)',
  BLOCKED_BY_TRUST_GATE: 'var(--red)',
};

const SPARKLINE = '▁▂▃▄▅▆▅▇▆▅▆▇█▇▆▅▆▇▆▅▄▅▆▇';

/* ── Agent responses ── */
const AGENT_RESPONSES = [
  'ACKNOWLEDGED — executing on devnet...',
  'CONFIRMED — order routed via Jupiter aggregator on devnet',
  'PROCESSING — trust gate verification in progress...',
  'QUEUED — transaction submitted to devnet cluster',
  'ACKNOWLEDGED — parameters updated, monitoring active',
  'CONFIRMED — portfolio rebalance initiated on devnet',
];

function agentResponse(): string {
  return AGENT_RESPONSES[Math.floor(Math.random() * AGENT_RESPONSES.length)];
}

/* ═══════════════════════════════════════════════════════ */
export default function AgentControlPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  /* ── Agent data ── */
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Section 1: Terminal ── */
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [cmdInput, setCmdInput] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  /* ── Section 2: Activity ── */
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  /* ── Section 3: Portfolio (mock) ── */
  const [spendingUsed, setSpendingUsed] = useState(340);

  /* ── Section 4: Controls ── */
  const [paused, setPaused] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [editCap, setEditCap] = useState('1000');
  const [capSaved, setCapSaved] = useState(false);

  /* ── Fetch agent ── */
  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setAgent(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Seed activity + terminal boot ── */
  useEffect(() => {
    setActivities(seedEntries(6));
    setLines([
      { sender: 'SYSTEM', text: 'CONTROL_PANEL initialized · connected to devnet cluster' },
      { sender: 'SYSTEM', text: 'AGENT session active · awaiting commands...' },
    ]);
  }, []);

  /* ── Auto-scroll terminal ── */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  /* ── Auto activity feed (8s interval) ── */
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      setActivities((prev) => [...prev, randomEntry()]);
      setSpendingUsed((prev) => Math.min(Number(editCap), prev + Math.floor(Math.random() * 30 + 5)));
    }, 8000);
    return () => clearInterval(iv);
  }, [paused, editCap]);

  /* ── Send command ── */
  const sendCommand = useCallback(() => {
    const text = cmdInput.trim();
    if (!text) return;
    setLines((prev) => [...prev, { sender: 'USER', text }]);
    setCmdInput('');
    // Add activity entry for the command
    setActivities((prev) => [...prev, randomEntry()]);
    // Simulated agent response after 1.2s
    setTimeout(() => {
      setLines((prev) => [...prev, { sender: 'AGENT', text: agentResponse() }]);
    }, 1200);
  }, [cmdInput]);

  /* ── Revoke handler ── */
  const handleRevoke = () => {
    setShowRevokeModal(false);
    router.push('/registry');
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[13px] font-mono text-zinc-500 tracking-widest animate-pulse">LOADING_CONTROL_PANEL...</div>
      </div>
    );
  }

  const tierLabel = agent ? (TIER_BADGE[agent.tier] ?? 'bronze') : 'bronze';
  const agentName = agent?.name ?? id;
  const agentStatus = paused ? 'standby' : (agent?.is_active ? 'active' : 'standby');

  /* ── Mock portfolio values ── */
  const delegatedAmt = '2,500 TRU';
  const currentVal = '$3,147.82';
  const pnlToday = '+$247.82';
  const successRate = '96.4%';
  const capMax = Number(editCap) || 1000;

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="mb-6">
        <Link
          href={`/agent/${id}`}
          className="inline-flex items-center gap-2 text-[12px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          BACK_TO_PASSPORT
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
              <Shield size={24} className="text-[var(--accent-green)]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[24px] font-bold">{agentName.toUpperCase().replace(/\s+/g, '_')}</h1>
                <TruvaBadge variant={tierLabel} />
                <TruvaStatusPill variant={agentStatus as 'active' | 'standby'} />
              </div>
              <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">
                CONTROL_PANEL · DEVNET_SESSION
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TruvaPulsingDot color={paused ? '#666' : 'var(--accent-green)'} size={8} />
            <span className={`text-[12px] uppercase tracking-[2px] font-bold ${paused ? 'text-[var(--text-muted)]' : 'text-[var(--accent-green)]'}`}>
              {paused ? 'AGENT_STANDBY' : 'AGENT_ONLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ══ SECTION 1: COMMAND_TERMINAL ══ */}
        <div className="bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px] font-mono text-[12px] flex flex-col" style={{ minHeight: 380 }}>
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <Terminal size={13} className="ml-3 text-[var(--text-muted)]" />
            <span className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">COMMAND_TERMINAL</span>
          </div>

          {/* Log area */}
          <div ref={logRef} className="flex-1 p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 280 }}>
            {lines.map((line, i) => (
              <div key={i} className="leading-[1.8]">
                {line.sender === 'USER' && (
                  <span><span className="text-[var(--accent-green)] font-bold">[USER]</span> <span className="text-[var(--accent-green)]">&gt;</span> <span className="text-[var(--text-primary)]">{line.text}</span></span>
                )}
                {line.sender === 'AGENT' && (
                  <span><span className="text-[var(--blue)] font-bold">[AGENT]</span> <span className="text-[var(--blue)]">&gt;</span> <span className="text-[var(--text-secondary)]">{line.text}</span></span>
                )}
                {line.sender === 'SYSTEM' && (
                  <span><span className="text-[var(--text-muted)]">[SYS]</span> <span className="text-[var(--text-muted)]">{line.text}</span></span>
                )}
              </div>
            ))}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[var(--accent-green)]">&gt;</span>
              <span className="w-2 h-4 bg-[var(--accent-green)] animate-terminal-blink" />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border-default)] p-3 flex gap-2">
            <input
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendCommand(); }}
              placeholder='e.g. "buy 5 SOL of JUP", "set stop loss 10%"'
              disabled={paused}
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-green)] focus:outline-none transition-colors disabled:opacity-40"
            />
            <button
              onClick={sendCommand}
              disabled={paused || !cmdInput.trim()}
              className="px-3 py-2 bg-[var(--accent-green)] text-[#000] rounded-[2px] hover:bg-[var(--accent-green-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* ══ SECTION 2: ACTIVITY_FEED ══ */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] flex flex-col" style={{ minHeight: 380 }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-default)]">
            <Activity size={14} className="text-[var(--accent-green)]" />
            <span className="text-[13px] uppercase tracking-[2px] font-bold">ACTIVITY_FEED</span>
            <span className="ml-auto text-[12px] uppercase tracking-[1px] text-[var(--text-muted)]">{activities.length} ENTRIES</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1" style={{ maxHeight: 320 }}>
            {[...activities].reverse().map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-[2px] text-[12px] ${
                  a.status === 'CONFIRMED' ? 'status-row-passed' : a.status === 'BLOCKED_BY_TRUST_GATE' ? 'status-row-blocked' : 'status-row-pending'
                } bg-[var(--bg-elevated)]`}
              >
                <span className="text-[var(--text-muted)] shrink-0 font-mono">{a.timestamp}</span>
                <span className="font-bold shrink-0 w-[90px]" style={{ color: a.action === 'GATE_CHECK' ? 'var(--amber)' : 'var(--text-primary)' }}>
                  {a.action}
                </span>
                <span className="text-[var(--text-secondary)] flex-1">{a.pair}</span>
                <span className="text-[var(--text-primary)] font-bold shrink-0">{a.amount}</span>
                <span className="shrink-0 font-bold text-[11px]" style={{ color: statusColor[a.status] }}>
                  {a.status === 'BLOCKED_BY_TRUST_GATE' ? 'BLOCKED' : a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SECTION 3: PORTFOLIO_SNAPSHOT ══ */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-[var(--accent-green)]" />
          <span className="text-[13px] uppercase tracking-[2px] font-bold">PORTFOLIO_SNAPSHOT</span>
          <span className="ml-auto text-[12px] uppercase tracking-[1px] text-[var(--text-muted)]">DEVNET_SIMULATED</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <TruvaStatCard label="DELEGATED_AMOUNT" value={delegatedAmt} sub="INITIAL DEPOSIT" icon={<Shield size={16} className="text-[var(--accent-green)]" />} />
          <TruvaStatCard label="CURRENT_VALUE" value={currentVal} sub="LIVE ESTIMATE" icon={<BarChart3 size={16} className="text-[var(--accent-green)]" />} />
          <TruvaStatCard label="P&L_TODAY" value={pnlToday} sub="+9.91%" valueColor="var(--accent-green)" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
          <TruvaStatCard label="SUCCESS_RATE" value={successRate} sub="ALL TRANSACTIONS" icon={<AlertTriangle size={16} className="text-[var(--accent-green)]" />} />
        </div>

        {/* Sparkline + Spending Cap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <div className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mb-3">VALUE_OVER_TIME</div>
            <div className="text-[24px] tracking-[4px] text-[var(--accent-green)] font-mono leading-none mb-2" aria-label="Sparkline chart">
              {SPARKLINE}
            </div>
            <div className="flex justify-between text-[12px] text-[var(--text-muted)] uppercase tracking-[1px]">
              <span>24H_AGO</span><span>NOW</span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <div className="flex justify-between text-[13px] mb-3">
              <span className="uppercase tracking-[2px] text-[var(--text-secondary)]">SPENDING_CAP_USED</span>
              <span className="text-[var(--accent-green)] font-bold">${Math.min(spendingUsed, capMax)} / ${capMax}</span>
            </div>
            <TruvaProgressBar
              value={Math.min(spendingUsed, capMax)}
              max={capMax}
              color={spendingUsed / capMax > 0.8 ? 'var(--amber)' : 'var(--accent-green)'}
              height={6}
            />
            <div className="text-[12px] text-[var(--text-muted)] mt-2 uppercase tracking-[1px]">
              {Math.max(0, capMax - spendingUsed)} REMAINING
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 4: DELEGATION_CONTROLS ══ */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={14} className="text-[var(--accent-green)]" />
          <span className="text-[13px] uppercase tracking-[2px] font-bold">DELEGATION_CONTROLS</span>
        </div>

        {/* Current delegation details */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px] p-4">
          {[
            { label: 'DELEGATED', value: delegatedAmt },
            { label: 'DURATION_LEFT', value: '23 DAYS' },
            { label: 'SPENDING_CAP', value: `$${editCap}` },
            { label: 'CHAINS', value: agent?.chains?.join(', ').toUpperCase() ?? 'SOLANA' },
          ].map((d) => (
            <div key={d.label}>
              <div className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)] mb-1">{d.label}</div>
              <div className="text-[14px] font-bold">{d.value}</div>
            </div>
          ))}
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-end gap-4">
          {/* PAUSE / RESUME */}
          <TruvaButton
            variant={paused ? 'primary' : 'outlined'}
            className="text-[12px]"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <><Play size={14} /> RESUME_AGENT</> : <><Pause size={14} /> PAUSE_AGENT</>}
          </TruvaButton>

          {/* REVOKE */}
          <TruvaButton
            variant="danger"
            className="text-[12px]"
            onClick={() => setShowRevokeModal(true)}
          >
            <ShieldOff size={14} /> REVOKE_DELEGATION
          </TruvaButton>

          {/* EDIT SPENDING CAP */}
          <div className="flex items-end gap-2 ml-auto">
            <div>
              <label className="block mb-1 text-[12px] uppercase tracking-[2px] text-[var(--text-muted)]">EDIT_SPENDING_CAP</label>
              <input
                type="number"
                value={editCap}
                onChange={(e) => { setEditCap(e.target.value); setCapSaved(false); }}
                className="w-[120px] bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-2 text-[13px] text-[var(--text-primary)] font-mono focus:border-[var(--accent-green)] focus:outline-none"
              />
            </div>
            <TruvaButton
              variant="outlined"
              className="text-[12px]"
              onClick={() => setCapSaved(true)}
            >
              <Save size={14} /> {capSaved ? 'SAVED ✓' : 'SAVE_CHANGES'}
            </TruvaButton>
          </div>
        </div>
      </div>

      {/* ── REVOKE CONFIRMATION MODAL ── */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[var(--bg-card)] border border-[var(--red)] rounded-[2px] p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-[var(--red)]" />
                <span className="text-[14px] uppercase tracking-[2px] font-bold text-[var(--red)]">CONFIRM_REVOCATION</span>
              </div>
              <button onClick={() => setShowRevokeModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] mb-2">
              This will permanently revoke your delegation to <span className="text-[var(--text-primary)] font-bold">{agentName}</span>.
            </p>
            <p className="text-[12px] text-[var(--text-muted)] uppercase tracking-[1px] mb-6">
              ALL_ACTIVE_SESSIONS_WILL_BE_TERMINATED · THIS_ACTION_CANNOT_BE_UNDONE
            </p>
            <div className="flex gap-3">
              <TruvaButton variant="ghost" className="flex-1 text-[12px]" onClick={() => setShowRevokeModal(false)}>
                CANCEL
              </TruvaButton>
              <TruvaButton variant="danger" className="flex-1 text-[12px]" onClick={handleRevoke}>
                REVOKE_DELEGATION
              </TruvaButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
