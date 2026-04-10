'use client';

import { useState, useEffect, useRef } from 'react';
import { TruvaButton, TruvaStatCard, TruvaStatusPill, TruvaTerminal, TruvaProgressBar, TruvaPulsingDot } from '@/components/ui/truva';
import { Shield, Zap, Activity, ShieldCheck, AlertTriangle, Play } from 'lucide-react';

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
          <p className="text-[10px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">INTERACTIVE PROTOCOL DEMONSTRATION · SANDBOX_MODE</p>
        </div>
        <TruvaButton variant="primary" className="text-[9px] flex items-center gap-1.5" onClick={runDemo} disabled={running}>
          <Play size={12} /> {running ? 'RUNNING...' : 'RUN_DEMO_SEQUENCE'}
        </TruvaButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <TruvaStatCard label="NETWORK_HEALTH" value={`${networkPulse.toFixed(1)}%`} sub="REAL-TIME" icon={<Activity size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="THREATS_BLOCKED" value="247" sub="THIS SESSION" icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ZK_PROOFS_GEN" value="1,204" sub="ZERO-KNOWLEDGE" icon={<Shield size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 mb-6">
        {/* Phase Tracker */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[11px] uppercase tracking-[2px] font-bold mb-4">PROTOCOL_PHASES</h3>
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
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-5">{p.desc}</p>
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
              <h3 className="text-[11px] uppercase tracking-[2px] font-bold">ATTACK_SIMULATOR</h3>
            </div>
            <div className="space-y-2 mb-4">
              {attackTypes.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAttack(a.id)}
                  className={`w-full text-left p-2.5 rounded-[2px] border text-[11px] transition-colors ${
                    selectedAttack === a.id
                      ? 'border-[var(--red)] text-[var(--red)] bg-[rgba(255,51,51,0.05)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div className="font-bold">{a.label}</div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{a.desc}</div>
                </button>
              ))}
            </div>
            <TruvaButton variant="danger" className="w-full text-[9px]" onClick={runAttack} disabled={attackRunning}>
              {attackRunning ? 'ATTACKING...' : 'LAUNCH_ATTACK'}
            </TruvaButton>
          </div>

          {/* Network Monitor */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <h3 className="text-[11px] uppercase tracking-[2px] font-bold mb-3">NETWORK_MONITOR</h3>
            <div className="space-y-2">
              {[
                { label: 'CONSENSUS', value: networkPulse, color: 'var(--accent-green)' },
                { label: 'THROUGHPUT', value: 78, color: 'var(--accent-green)' },
                { label: 'VALIDATOR_SYNC', value: 96, color: 'var(--accent-green)' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-[10px] mb-1">
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
    </div>
  );
}
