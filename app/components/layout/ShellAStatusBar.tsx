'use client';

import { useEffect, useState } from 'react';
import { TruvaPulsingDot } from '@/components/ui/truva';
import { getConnection } from '@/lib/solana/connection';
import { TRUSTGATE_PROGRAM_ID } from '@/lib/solana';

const REFRESH_MS = 15_000;

interface ClusterStatus {
  slot: number;
  epoch: number;
  latencyMs: number;
}

export function ShellAStatusBar() {
  const [utc, setUtc] = useState('--:--:--');
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [reachable, setReachable] = useState(true);

  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const started = performance.now();
      try {
        const info = await getConnection().getEpochInfo();
        if (cancelled) return;
        setStatus({ slot: info.absoluteSlot, epoch: info.epoch, latencyMs: Math.round(performance.now() - started) });
        setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
    };
    poll();
    const id = setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const programId = TRUSTGATE_PROGRAM_ID.toBase58();

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 h-9 flex items-center px-5 text-[11px] uppercase tracking-[2px] font-mono"
      style={{
        background: 'rgba(6,9,13,0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border-default)',
      }}
    >
      {/* Left: status */}
      <div className="flex items-center gap-2 shrink-0">
        <TruvaPulsingDot size={4} />
        <span className={`font-semibold ${reachable ? 'text-[var(--accent-green)]' : 'text-[var(--red)]'}`}>
          {reachable ? 'RPC_CONNECTED' : 'RPC_UNREACHABLE'}
        </span>
        <span className="text-[var(--border-hover)] mx-1">·</span>
        <span className="text-[var(--text-muted)]">DEVNET</span>
      </div>

      {/* Center: live cluster metrics */}
      <div className="flex-1 hidden md:flex items-center justify-center gap-6 text-[var(--text-muted)]">
        <span>SLOT: <span className="text-[var(--text-secondary)]">{status ? status.slot.toLocaleString('en-US') : '—'}</span></span>
        <span className="text-[var(--border-default)]">|</span>
        <span>RPC_LATENCY: <span className="text-[var(--text-secondary)]">{status ? `${status.latencyMs}MS` : '—'}</span></span>
        <span className="text-[var(--border-default)]">|</span>
        <span>EPOCH: <span className="text-[var(--text-secondary)]">{status ? status.epoch : '—'}</span></span>
      </div>

      {/* Right: clock and program */}
      <div className="flex items-center gap-3 text-[var(--text-muted)] shrink-0 ml-auto">
        <span>UTC: <span className="text-[var(--text-secondary)]">{utc}</span></span>
        <a
          href={`https://explorer.solana.com/address/${programId}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-0.5 rounded text-[10px] tracking-widest"
          style={{ border: '1px solid rgba(0,232,122,0.3)', color: 'var(--accent-green)', background: 'rgba(0,232,122,0.06)' }}
        >
          PROGRAM: {programId.slice(0, 4)}…{programId.slice(-4)}
        </a>
      </div>
    </footer>
  );
}
