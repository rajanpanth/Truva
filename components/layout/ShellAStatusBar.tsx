'use client';

import { useEffect, useState } from 'react';
import { TruvaPulsingDot } from '@/components/ui/truva';

export function ShellAStatusBar() {
  const [utc, setUtc] = useState('--:--:--');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setUtc(
        d.toISOString().slice(11, 19),
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-9 bg-[var(--bg-terminal)] border-t border-[var(--border-default)] flex items-center px-4 text-[13px] uppercase tracking-[2px] font-mono">
      <div className="flex items-center gap-2">
        <TruvaPulsingDot size={5} />
        <span className="text-[var(--accent-green)]">NETWORK_STABLE</span>
      </div>
      <div className="flex-1 flex items-center justify-center gap-4 text-[var(--text-secondary)]">
        <span>VERIFICATION_RATE: 1,422/SEC</span>
        <span>AVG_LATENCY: 102MS</span>
      </div>
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <span>UTC: {utc}</span>
        <span className="px-2 py-0.5 border border-[var(--accent-green)] text-[var(--accent-green)] rounded-[2px] text-[12px]">
          SESSION_ID: 0X44FEA
        </span>
      </div>
    </footer>
  );
}
