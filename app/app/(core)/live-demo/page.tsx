'use client';

import { useState, useEffect, useRef } from 'react';
import { TruvaButton, TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaPulsingDot } from '@/components/ui/truva';
import { Shield, Activity, ShieldCheck, AlertTriangle, Play, Lock, Zap, ExternalLink } from 'lucide-react';
import { useMagicBlockPayment } from '@/lib/hooks/useMagicBlockPayment';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const phases = [
  { name: 'AGENT_REGISTRATION', desc: 'Registering agent on-chain with compliance metadata.', duration: 2000 },
  { name: 'TX_SUBMISSION', desc: 'Submitting simulated swap transaction through TrustGate.', duration: 2500 },
  { name: 'VERIFICATION', desc: 'Running ZK-proof validation and risk assessment engine.', duration: 3000 },
  { name: 'SETTLEMENT', desc: 'Transaction settled. Reputation score updated.', duration: 1500 },
];

const attackTypes = [
  { id: 'replay', label: 'REPLAY_ATTACK', desc: 'Duplicate transaction replay attempt' },
  { id: 'spoofing', label: 'IDENTITY_SPOOF', desc: 'Forged agent identity bypass' },
  { id: 'overflow', label: 'OVERFLOW_EXPLOIT', desc: 'Integer overflow in stake calculation' },
  { id: 'dos', label: 'RATE_FLOOD', desc: 'Denial of service via TX flooding' },
];

export default function LiveDemoPage() {
  const [running, setRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(-1);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [terminalLines, setTerminalLines] = useState<string[]>(['[SYS] TRUVA_KERNEL_LOGGER initialized', '[SYS] Awaiting demo sequence...']);
  const [attackRunning, setAttackRunning] = useState(false);
  const [selectedAttack, setSelectedAttack] = useState(attackTypes[0].id);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // MagicBlock private payment state
  const { connected } = useWallet();
  const { sendPrivatePayment, status: payStatus, txSignature, logs: payLogs, reset: resetPay, isLoading: payLoading } = useMagicBlockPayment();
  const [toAddress, setToAddress] = useState('');
  const [payAmount, setPayAmount] = useState('1000000');

  const addLine = (line: string) => {
    setTerminalLines((prev) => [...prev.slice(-48), line]);
  };

  const runDemo = async () => {
    if (running) return;
    setRunning(true);
    setCompletedPhases([]);
    setTerminalLines(['[SYS] TRUVA_KERNEL_LOGGER initialized', '[ACTION] Demo sequence initiated...']);

    for (let i = 0; i < phases.length; i++) {
      setCurrentPhase(i);
      addLine(`[INFO] Phase ${i + 1}: ${phases[i].name} started`);
      await new Promise((r) => { timerRef.current = setTimeout(r, phases[i].duration); });
      addLine(`[AUTH] Phase ${i + 1}: ${phases[i].name} completed ✓`);
      setCompletedPhases((prev) => [...prev, i]);
    }

    addLine('[SYS] Demo sequence complete · All phases passed');
    setCurrentPhase(-1);
    setRunning(false);
  };

  const runAttack = async () => {
    if (attackRunning) return;
    setAttackRunning(true);
    const attack = attackTypes.find((a) => a.id === selectedAttack)!;
    addLine(`[ALERT] ⚠ Attack simulation: ${attack.label}`);
    addLine(`[WARN] Incoming ${attack.desc}...`);
    await new Promise((r) => setTimeout(r, 1500));
    addLine(`[AUTH] TrustGate intercepted · ZK Shield active`);
    await new Promise((r) => setTimeout(r, 1000));
    addLine(`[SYS] Attack ${attack.label} BLOCKED · Risk score adjusted`);
    addLine(`[INFO] Threat neutralized in 2.5s`);
    setAttackRunning(false);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const [networkPulse, setNetworkPulse] = useState(94);
  useEffect(() => {
    const id = setInterval(() => {
      setNetworkPulse((p) => Math.max(80, Math.min(100, p + (Math.random() - 0.5) * 4)));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold">LIVE_DEMO</h1>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">INTERACTIVE PROTOCOL DEMONSTRATION · SANDBOX_MODE</p>
        </div>
        <TruvaButton variant="primary" className="text-[12px] flex items-center gap-1.5" onClick={runDemo} disabled={running}>
          <Play size={12} /> {running ? 'RUNNING...' : 'RUN_DEMO_SEQUENCE'}
        </TruvaButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <TruvaStatCard label="NETWORK_HEALTH" value={`${networkPulse.toFixed(1)}%`} sub="REAL-TIME" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="THREATS_BLOCKED" value="247" sub="THIS SESSION" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ZK_PROOFS_GEN" value="1,204" sub="ZERO-KNOWLEDGE" icon={<Shield size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-6">
        {/* Phase Tracker */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">PROTOCOL_PHASES</h3>
          <div className="space-y-3">
            {phases.map((p, i) => {
              const isActive = currentPhase === i;
              const isComplete = completedPhases.includes(i);
              return (
                <div key={p.name} className={`p-3 rounded-[2px] border transition-all ${
                  isActive ? 'border-[var(--accent-green)] bg-[var(--accent-green-dim)]' :
                  isComplete ? 'border-[var(--accent-green)] bg-[var(--bg-elevated)]' :
                  'border-[var(--border-default)] bg-[var(--bg-elevated)]'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isActive && <TruvaPulsingDot size={6} />}
                      {isComplete && <ShieldCheck size={14} className="text-[var(--accent-green)]" />}
                      {!isActive && !isComplete && <div className="w-3.5 h-3.5 border border-[var(--text-dim)] rounded-full" />}
                      <span className={`text-[12px] font-bold ${isActive || isComplete ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)]'}`}>
                        PHASE_{i + 1}: {p.name}
                      </span>
                    </div>
                    {isActive && <TruvaStatusPill variant="live" />}
                    {isComplete && <TruvaStatusPill variant="passed" />}
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)] mt-1 ml-5">{p.desc}</p>
                  {isActive && <TruvaProgressBar value={50} className="mt-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attack Simulator */}
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={14} className="text-[var(--red)]" />
              <h3 className="text-[13px] uppercase tracking-[2px] font-bold">ATTACK_SIMULATOR</h3>
            </div>
            <div className="space-y-2 mb-4">
              {attackTypes.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAttack(a.id)}
                  className={`w-full text-left p-2.5 rounded-[2px] border text-[13px] transition-colors ${
                    selectedAttack === a.id
                      ? 'border-[var(--red)] text-[var(--red)] bg-[rgba(255,51,51,0.05)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div className="font-bold">{a.label}</div>
                  <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{a.desc}</div>
                </button>
              ))}
            </div>
            <TruvaButton variant="danger" className="w-full text-[12px]" onClick={runAttack} disabled={attackRunning}>
              {attackRunning ? 'ATTACKING...' : 'LAUNCH_ATTACK'}
            </TruvaButton>
          </div>

          {/* Network Monitor */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">NETWORK_MONITOR</h3>
            <div className="space-y-2">
              {[
                { label: 'CONSENSUS', value: networkPulse, color: 'var(--accent-green)' },
                { label: 'THROUGHPUT', value: 78, color: 'var(--accent-green)' },
                { label: 'VALIDATOR_SYNC', value: 96, color: 'var(--accent-green)' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span className="text-[var(--text-secondary)]">{m.label}</span>
                    <span style={{ color: m.color }}>{m.value.toFixed(1)}%</span>
                  </div>
                  <TruvaProgressBar value={m.value} color={m.color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Logger */}
      <TruvaTerminal
        title="TRUVA_KERNEL_LOGGER"
        lines={terminalLines}
        showCursor
        maxHeight="240px"
      />

      {/* MagicBlock Private Payment Panel */}
      <div className="mt-6 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={14} className="text-[var(--accent-green)]" />
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold">PRIVATE_PAYMENT · MAGICBLOCK_PER</h3>
          <span className="ml-auto text-[11px] px-2 py-0.5 border border-[var(--accent-green)] text-[var(--accent-green)] rounded-[2px] uppercase tracking-widest">LIVE</span>
        </div>
        <p className="text-[12px] text-[var(--text-muted)] mb-4">
          Trust-gated private SPL transfers via MagicBlock Private Ephemeral Rollup · Payment amount &amp; routing hidden on-chain
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input form */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[var(--text-secondary)] mb-1">RECIPIENT_PUBKEY</label>
              <input
                type="text"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="Solana wallet address..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent-green)]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-[var(--text-secondary)] mb-1">AMOUNT · USDC BASE UNITS</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                min="1"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] px-3 py-2 text-[13px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-green)]"
              />
              <p className="text-[11px] text-[var(--text-dim)] mt-1">1,000,000 = 1 USDC (devnet)</p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {!connected ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--text-muted)]">Connect wallet to send private payment</span>
                  <WalletMultiButton style={{ fontSize: '12px', height: '32px', padding: '0 12px', borderRadius: '2px' }} />
                </div>
              ) : (
                <div className="flex gap-2">
                  <TruvaButton
                    variant="primary"
                    className="flex-1 text-[12px] flex items-center justify-center gap-1.5"
                    disabled={payLoading || !toAddress.trim() || !payAmount}
                    onClick={() => {
                      sendPrivatePayment({
                        toAddress: toAddress.trim(),
                        amount: parseInt(payAmount, 10),
                        memo: 'Truva trust-gated private payment',
                      });
                    }}
                  >
                    <Zap size={12} />
                    {payLoading ? `${payStatus.toUpperCase()}...` : 'SEND_PRIVATE_PAYMENT'}
                  </TruvaButton>
                  {payStatus !== 'idle' && (
                    <TruvaButton variant="outlined" className="text-[12px]" onClick={resetPay}>
                      RESET
                    </TruvaButton>
                  )}
                </div>
              )}
            </div>

            {/* Status badge */}
            {payStatus !== 'idle' && (
              <div className={`p-3 rounded-[2px] border text-[12px] font-mono ${
                payStatus === 'confirmed' ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]' :
                payStatus === 'error' ? 'border-[var(--red)] text-[var(--red)] bg-[rgba(255,51,51,0.05)]' :
                'border-[var(--border-default)] text-[var(--text-secondary)]'
              }`}>
                STATUS: {payStatus.toUpperCase()}
                {txSignature && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[var(--text-muted)]">SIG:</span>
                    <a
                      href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline flex items-center gap-0.5"
                    >
                      {txSignature.slice(0, 20)}... <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Architecture note */}
            <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-bold">HOW IT WORKS</p>
              <p className="text-[12px] text-[var(--text-muted)]">① Truva TrustGate validates agent tier on-chain</p>
              <p className="text-[12px] text-[var(--text-muted)]">② Wallet signs MagicBlock TEE challenge</p>
              <p className="text-[12px] text-[var(--text-muted)]">③ Private transfer built via MagicBlock PER API</p>
              <p className="text-[12px] text-[var(--text-muted)]">④ Amount &amp; routing hidden in Private Ephemeral Rollup</p>
              <p className="text-[12px] text-[var(--text-muted)]">⑤ Settlement committed back to Solana base layer</p>
            </div>
          </div>

          {/* Payment log terminal */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-bold mb-2">PAYMENT_LOG</p>
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] p-3 h-[280px] overflow-y-auto font-mono text-[12px] space-y-0.5">
              {payLogs.length === 0 ? (
                <span className="text-[var(--text-dim)]">› Awaiting payment initiation...</span>
              ) : (
                payLogs.map((l, i) => (
                  <div key={i} className={
                    l.type === 'success' ? 'text-[var(--accent-green)]' :
                    l.type === 'error' ? 'text-[var(--red)]' :
                    l.type === 'warn' ? 'text-yellow-400' :
                    'text-[var(--text-secondary)]'
                  }>
                    <span className="text-[var(--text-dim)]">[{l.timestamp}]</span> {l.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
