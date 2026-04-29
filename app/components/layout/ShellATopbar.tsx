'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Terminal, X, Copy, Check, ChevronRight } from 'lucide-react';
import { TruvaButton } from '@/components/ui/truva';

const navItems = [
  { label: 'REGISTRY',  href: '/registry' },
  { label: 'REPUTATION', href: '/reputation' },
  { label: 'VALIDATOR',  href: '/validator' },
  { label: 'SDK_DOCS',   href: '/sdk-docs' },
];

const SDK_STEPS = [
  {
    step: '01',
    title: 'Install the SDK',
    lang: 'bash',
    code: `npm install @truva-protocol/sdk`,
  },
  {
    step: '02',
    title: 'Initialize Client',
    lang: 'typescript',
    code: `import { TruvaSDK } from 'truva-sdk';

const truva = new TruvaSDK({
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  apiUrl: 'https://api.truva.xyz',
});`,
  },
  {
    step: '03',
    title: 'Gate a Payment by Trust Tier',
    lang: 'typescript',
    code: `import { TruvaError } from 'truva-sdk';

try {
  // Throws if agent is below Gold tier or frozen
  await truva.requireTrustTier('Gold', agentPubkey);
  // \u2705 Safe to proceed with payment
} catch (err) {
  if (err instanceof TruvaError) {
    console.log(\`Blocked: \${err.currentTier} < Gold\`);
  }
}`,
  },
  {
    step: '04',
    title: 'Read On-Chain Trust Score',
    lang: 'typescript',
    code: `const score = await truva.getAgentScore(agentPubkey);

console.log(score.tier);       // 'Gold'
console.log(score.score);      // 87
console.log(score.frozen);     // false`,
  },
  {
    step: '05',
    title: 'Eliza / LangChain Integration',
    lang: 'typescript',
    code: `// Eliza OS plugin
import { truvaPlugin } from 'truva-sdk/eliza';

// LangChain tool
import { createTruvaTool } from 'truva-sdk/langchain';
const tool = createTruvaTool(truva);`,
  },
];

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-md flex items-center justify-center transition-all"
      style={{ background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.2)', color: copied ? 'var(--accent-green)' : 'var(--text-muted)' }}
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function SDKTerminalModal({ onClose }: { onClose: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const step = SDK_STEPS[activeStep];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[780px] rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 0 60px rgba(0,232,122,0.08), 0 24px 80px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ background: 'rgba(11,17,24,0.95)', borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Terminal size={13} className="text-[var(--accent-green)]" />
            <span className="text-[11px] uppercase tracking-[3px] text-[var(--text-secondary)] font-mono">TRUVA_SDK — AGENT INTEGRATION GUIDE</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Step sidebar */}
          <div className="w-[200px] shrink-0 flex flex-col py-3 overflow-y-auto"
            style={{ borderRight: '1px solid var(--border-default)', background: 'rgba(7,11,16,0.8)' }}>
            {SDK_STEPS.map((s, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(i)}
                  className="flex items-start gap-2.5 px-4 py-3 text-left transition-all"
                  style={isActive ? {
                    background: 'linear-gradient(90deg, rgba(0,232,122,0.1), rgba(0,232,122,0.03))',
                    boxShadow: 'inset 2px 0 0 var(--accent-green)',
                  } : {}}
                >
                  <span
                    className="text-[10px] font-bold tabular-nums mt-0.5 shrink-0"
                    style={{ color: isActive ? 'var(--accent-green)' : isDone ? 'rgba(0,232,122,0.5)' : 'var(--text-muted)' }}
                  >
                    {s.step}
                  </span>
                  <span
                    className="text-[11px] leading-snug"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}

            <div className="mt-auto px-4 py-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <a
                href="/sdk-docs"
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[2px] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-green)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Full Docs <ChevronRight size={10} />
              </a>
            </div>
          </div>

          {/* Code pane */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-[2px]"
                  style={{ background: 'rgba(0,232,122,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(0,232,122,0.2)' }}>
                  {step.step}
                </span>
                <h3 className="text-[13px] font-bold text-[var(--text-primary)]">{step.title}</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="relative rounded-lg overflow-hidden"
                style={{ background: '#0d1117', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-[10px] uppercase tracking-[2px] text-[var(--text-muted)]">{step.lang}</span>
                </div>
                <CopyButton code={step.code} />
                <pre className="p-4 text-[12px] leading-relaxed font-mono overflow-x-auto"
                  style={{ color: 'var(--text-secondary)' }}>
                  <code>{step.code}</code>
                </pre>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
                  disabled={activeStep === 0}
                  className="text-[11px] uppercase tracking-[2px] px-4 py-2 rounded-md transition-all disabled:opacity-30"
                  style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { if (activeStep > 0) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  ← Prev
                </button>
                <span className="text-[11px] text-[var(--text-muted)] tabular-nums">{activeStep + 1} / {SDK_STEPS.length}</span>
                {activeStep < SDK_STEPS.length - 1 ? (
                  <button
                    onClick={() => setActiveStep((p) => p + 1)}
                    className="text-[11px] uppercase tracking-[2px] px-4 py-2 rounded-md transition-all"
                    style={{ background: 'var(--accent-green-dim)', border: '1px solid rgba(0,232,122,0.3)', color: 'var(--accent-green)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,232,122,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent-green-dim)'; }}
                  >
                    Next →
                  </button>
                ) : (
                  <a href="/sdk-docs">
                    <button
                      className="text-[11px] uppercase tracking-[2px] px-4 py-2 rounded-md transition-all"
                      style={{ background: 'var(--accent-green)', color: '#000', fontWeight: 700 }}
                    >
                      Full Docs →
                    </button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShellATopbar() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center px-5 gap-6"
        style={{
          background: 'rgba(6,9,13,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-default)',
          boxShadow: '0 1px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <img src="/mainlogo.png" alt="TRUVA" className="h-7 w-auto object-contain" />
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--border-default)]" />

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative px-3 py-1.5 text-[11px] uppercase tracking-[2px] font-medium rounded-md transition-all duration-200 ${
                  active
                    ? 'text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-[1px] bg-[var(--accent-green)]" style={{ boxShadow: '0 0 8px var(--accent-green)' }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <TruvaButton variant="outlined" className="text-[11px] px-3 py-1.5 gap-1.5" onClick={() => setModalOpen(true)}>
          <Terminal size={12} /> LAUNCH_TERMINAL
        </TruvaButton>
      </header>

      {modalOpen && <SDKTerminalModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
