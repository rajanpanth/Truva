'use client';

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-[var(--text-muted)]" />
          <span className="text-[9px] uppercase tracking-[2px] text-[var(--text-muted)]">{language}</span>
        </div>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[1px] text-[var(--text-secondary)] hover:text-[var(--accent-green)] transition-colors">
          {copied ? <><Check size={12} className="text-[var(--accent-green)]" /> COPIED</> : <><Copy size={12} /> COPY</>}
        </button>
      </div>
      <pre className="p-4 text-[12px] leading-relaxed overflow-x-auto"><code className="text-[var(--accent-green)]">{code}</code></pre>
    </div>
  );
}
