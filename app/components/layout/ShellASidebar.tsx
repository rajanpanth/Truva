'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Server, Shield, Activity, Key, Cpu, FileText, HelpCircle, Bot, Zap,
} from 'lucide-react';
import { TruvaButton, TruvaPulsingDot } from '@/components/ui/truva';

interface NavItem { label: string; href: string; icon: React.ReactNode; }

const navGroups: { section: string; items: NavItem[] }[] = [
  {
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard',     href: '/dashboard',      icon: <LayoutDashboard size={15} /> },
      { label: 'Agent Registry',href: '/registry',       icon: <Bot size={15} /> },
    ],
  },
  {
    section: 'MONITORING',
    items: [
      { label: 'TrustGate Logs',href: '/trustgate-logs', icon: <Activity size={15} /> },
      { label: 'Reputation',    href: '/reputation',     icon: <Shield size={15} /> },
      { label: 'Validator',     href: '/validator',      icon: <Key size={15} /> },
    ],
  },
  {
    section: 'TOOLS',
    items: [
      { label: 'Live Demo',     href: '/live-demo',      icon: <Cpu size={15} /> },
      { label: 'SDK Docs',      href: '/sdk-docs',       icon: <FileText size={15} /> },
    ],
  },
];

export function ShellASidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden lg:flex fixed top-[52px] left-0 w-[220px] h-[calc(100vh-52px-36px)] flex-col z-40"
      style={{ background: 'linear-gradient(180deg, #0b1118 0%, #070b10 100%)', borderRight: '1px solid var(--border-default)' }}>

      {/* Node identity */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(0,232,122,0.15), rgba(0,232,122,0.05))', border: '1px solid rgba(0,232,122,0.2)' }}>
            <Server size={16} className="text-[var(--accent-green)]" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] text-[var(--text-primary)] font-bold tracking-wide">NODE_001</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TruvaPulsingDot size={4} />
              <span className="text-[11px] text-[var(--accent-green)] tracking-widest">SOLANA_MAINNET</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-1">
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-[3px] text-[var(--text-muted)] font-semibold">
              {group.section}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-lg text-[12px] tracking-wide transition-all duration-200 ${
                    active
                      ? 'text-[var(--accent-green)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={active ? {
                    background: 'linear-gradient(90deg, rgba(0,232,122,0.12) 0%, rgba(0,232,122,0.03) 100%)',
                    boxShadow: 'inset 2px 0 0 var(--accent-green)',
                  } : {}}
                >
                  <span className={`shrink-0 transition-colors ${active ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-truva-pulse" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-[var(--border-default)] space-y-3">
        <Link href="/register">
          <TruvaButton variant="outlined" className="w-full text-[11px] py-2">
            <Zap size={12} /> DEPLOY_AGENT
          </TruvaButton>
        </Link>
        <div className="flex gap-3">
          <Link href="/sdk-docs" className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <FileText size={12} /> Docs
          </Link>
          <Link href="#" className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <HelpCircle size={12} /> Support
          </Link>
        </div>
      </div>
    </aside>
  );
}
