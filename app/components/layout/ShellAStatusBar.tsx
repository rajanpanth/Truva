'use client';

import { useEffect, useState } from 'react';
import { TruvaPulsingDot } from '@/components/ui/truva';

export function ShellAStatusBar() {
  const [utc, setUtc] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 h-9 flex items-center px-5 text-[11px] uppercase tracking-[2px] font-mono"
      style={{
        background: 'rgba(6,9,13,0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid var(--border-default)',
      }}
    >
      {/* Left â€” status */}
      <div className="flex items-center gap-2 shrink-0">
        <TruvaPulsingDot size={4} />
        <span className="text-[var(--accent-green)] font-semibold">NETWORK_STABLE</span>
        <span className="text-[var(--border-hover)] mx-1">Â·</span>
        <span className="text-[var(--text-muted)]">DEVNET</span>
      </div>

      {/* Center â€” metrics */}
      <div className="flex-1 flex items-center justify-center gap-6 text-[var(--text-muted)]">
        <span>VERIFICATION_RATE: <span className="text-[var(--text-secondary)]">1,422/SEC</span></span>
        <span className="text-[var(--border-default)]">|</span>
        <span>AVG_LATENCY: <span className="text-[var(--text-secondary)]">102MS</span></span>
        <span className="text-[var(--border-default)]">|</span>
        <span>EPOCH: <span className="text-[var(--text-secondary)]">412</span></span>
      </div>

      {/* Right â€” session */}
      <div className="flex items-center gap-3 text-[var(--text-muted)] shrink-0">
        <span>UTC: <span className="text-[var(--text-secondary)]">{utc}</span></span>
        <span
          className="px-2 py-0.5 rounded text-[10px] tracking-widest"
          style={{ border: '1px solid rgba(0,232,122,0.3)', color: 'var(--accent-green)', background: 'rgba(0,232,122,0.06)' }}
        >
          SESSION: 0X44FEA
        </span>
      </div>
    </footer>
  );
}
