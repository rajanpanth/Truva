'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Bot, Activity, FileText, Settings, HelpCircle, Bell, MessageSquare, Search, User, X } from 'lucide-react';
import { TruvaPulsingDot } from '@/components/ui/truva';

const sidebarItems = [
  { label: 'Registry', href: '/registry', icon: <Bot size={16} /> },
  { label: 'Reputation', href: '/reputation', icon: <Activity size={16} /> },
  { label: 'Documentation', href: '/sdk-docs', icon: <FileText size={16} /> },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<'notifications' | 'messages' | 'profile' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenPanel(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      {/* Left sidebar */}
      <aside className="hidden lg:flex w-[200px] flex-col p-4 shrink-0"
        style={{ background: 'linear-gradient(180deg,#0b1118 0%,#070b10 100%)', borderRight: '1px solid var(--border-default)' }}>
        <div className="mb-8">
          <img src="/assets/logo/truva-logo.png" alt="Truva" className="site-logo" />
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = (item.href === '/registry' && pathname === '/dashboard');
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 mx-0 px-3 py-2.5 rounded-lg text-[12px] transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--accent-green)] font-medium'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
                style={isActive ? { background: 'linear-gradient(90deg,rgba(0,232,122,0.12),rgba(0,232,122,0.03))', boxShadow: 'inset 2px 0 0 var(--accent-green)' } : undefined}
              >
                <span className={isActive ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 mt-auto" style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">
            <Settings size={14} /> Settings
          </Link>
          <Link href="#" className="flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all">
            <HelpCircle size={14} /> Support
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 flex items-center px-6 gap-4 shrink-0"
          style={{ background: 'rgba(6,9,13,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-2 text-[12px]">
            <TruvaPulsingDot size={5} />
            <span className="text-[var(--accent-green)] font-semibold uppercase tracking-widest">Platform Dashboard</span>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              placeholder="Search nodes..."
              className="pl-8 pr-3 py-1.5 rounded-lg text-[12px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)] w-full sm:w-[200px] focus:outline-none transition-all"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          </div>
          <div className="relative flex items-center gap-1">
          <button onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')} className={`relative p-1.5 transition-colors ${openPanel === 'notifications' ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-green)] rounded-full" />
          </button>
          <button onClick={() => setOpenPanel(openPanel === 'messages' ? null : 'messages')} className={`p-1.5 transition-colors ${openPanel === 'messages' ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <MessageSquare size={16} />
          </button>
          <button onClick={() => setOpenPanel(openPanel === 'profile' ? null : 'profile')} className={`p-1.5 transition-colors ${openPanel === 'profile' ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            <User size={16} />
          </button>

          {/* Dropdown panels */}
          {openPanel && (
            <div ref={panelRef} className="absolute top-12 right-0 w-[calc(100vw-2rem)] sm:w-[300px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                <span className="text-[13px] uppercase tracking-[2px] font-bold">
                  {openPanel === 'notifications' && 'NOTIFICATIONS'}
                  {openPanel === 'messages' && 'MESSAGES'}
                  {openPanel === 'profile' && 'OPERATOR_PROFILE'}
                </span>
                <button onClick={() => setOpenPanel(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={14} />
                </button>
              </div>

              {openPanel === 'notifications' && (
                <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
                  {[
                    { msg: 'TRADEBOT_X trust score updated to 99.8%', time: '2m ago', type: 'info' },
                    { msg: 'GUARD_PROTO flagged for anomaly review', time: '14m ago', type: 'warn' },
                    { msg: 'New agent NEXUS_BRIDGE registered', time: '1h ago', type: 'info' },
                    { msg: 'TrustGate blocked suspicious TX', time: '3h ago', type: 'alert' },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer">
                      <TruvaPulsingDot size={6} />
                      <div>
                        <p className="text-[13px] text-[var(--text-primary)]">{n.msg}</p>
                        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {openPanel === 'messages' && (
                <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
                  {[
                    { from: 'SYSTEM', msg: 'Epoch 42 validation complete.', time: '5m ago' },
                    { from: 'ORACLE_EYE', msg: 'Data feed latency spike detected.', time: '22m ago' },
                    { from: 'ADMIN', msg: 'Scheduled maintenance at 04:00 UTC.', time: '2h ago' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer">
                      <div className="w-6 h-6 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-[var(--text-muted)]">{m.from[0]}</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-secondary)]">{m.from}</p>
                        <p className="text-[13px] text-[var(--text-primary)]">{m.msg}</p>
                        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{m.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {openPanel === 'profile' && (
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
                      <User size={18} className="text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold">OPERATOR_0x9A</p>
                      <p className="text-[13px] text-[var(--text-muted)]">admin@truva.network</p>
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-[var(--border-subtle)] pt-3">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-[2px] transition-colors">
                      <User size={14} /> Profile
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-[2px] transition-colors">
                      <Settings size={14} /> Settings
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--status-blocked)] hover:bg-[var(--bg-elevated)] rounded-[2px] transition-colors">
                      <X size={14} /> Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 lg:p-8 bg-[var(--bg-base)]">
          {children}
        </main>
      </div>
    </div>
  );
}
