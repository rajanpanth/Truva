'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Shield,
  Activity,
  Key,
  Cpu,
  FileText,
  HelpCircle,
  Bot,
} from 'lucide-react';
import { TruvaButton } from '@/components/ui/truva';
import { TruvaPulsingDot } from '@/components/ui/truva';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'DASHBOARD', href: '/dashboard', icon: <LayoutDashboard size={15} /> },
  { label: 'AGENT_REGISTRY', href: '/registry', icon: <Bot size={15} /> },
  { label: 'TRUSTGATE_LOGS', href: '/trustgate-logs', icon: <Activity size={15} /> },
  { label: 'REPUTATION', href: '/reputation', icon: <Shield size={15} /> },
  { label: 'LIVE_DEMO', href: '/live-demo', icon: <Cpu size={15} /> },
  { label: 'VALIDATOR', href: '/validator', icon: <Key size={15} /> },
  { label: 'SDK_DOCS', href: '/sdk-docs', icon: <FileText size={15} /> },
];

const sdkNavItems: { section: string; items: NavItem[] }[] = [
  {
    section: 'CORE_SYSTEM',
    items: [
      { label: 'DASHBOARD', href: '/dashboard', icon: <LayoutDashboard size={15} /> },
      { label: 'SDK_DOCUMENTATION', href: '/sdk-docs', icon: <FileText size={15} /> },
      { label: 'AGENT_REGISTRY', href: '/registry', icon: <Bot size={15} /> },
    ],
  },
  {
    section: 'MONITORING',
    items: [
      { label: 'TRUSTGATE_LOGS', href: '/trustgate-logs', icon: <Activity size={15} /> },
      { label: 'REPUTATION', href: '/reputation', icon: <Shield size={15} /> },
      { label: 'VALIDATOR', href: '/validator', icon: <Key size={15} /> },
    ],
  },
];

export function ShellASidebar() {
  const pathname = usePathname();
  const isSdkPage = pathname === '/sdk-docs';
  const items = isSdkPage ? null : navItems;

  return (
    <aside className="hidden lg:flex fixed top-12 left-0 w-[210px] h-[calc(100vh-48px-36px)] bg-[var(--bg-input)] border-r border-[var(--border-default)] flex-col z-40">
      {/* Node profile */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[2px] bg-[var(--border-default)] flex items-center justify-center">
            <Server size={16} className="text-[var(--accent-green)]" />
          </div>
          <div>
            <div className="text-[12px] text-[var(--text-primary)] font-bold">NODE_001</div>
            <div className="flex items-center gap-1">
              <TruvaPulsingDot size={5} />
              <span className="text-[10px] text-[var(--accent-green)]">SOLANA_MAINNET</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {isSdkPage ? (
          sdkNavItems.map((group) => (
            <div key={group.section}>
              <div className="px-4 pt-4 pb-2 text-[9px] uppercase tracking-[2px] text-[var(--text-muted)]">
                {group.section}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-[11px] uppercase tracking-[1px] transition-colors ${
                      isActive
                        ? 'text-[var(--accent-green)] bg-[var(--accent-green-dim)] border-l-2 border-[var(--accent-green)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))
        ) : (
          items?.map((item) => {
            const isActive =
              (item.href === '/dashboard' && pathname === '/dashboard') ||
              (item.href !== '/dashboard' && item.href !== '#' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-[11px] uppercase tracking-[1px] transition-colors ${
                  isActive
                    ? 'text-[var(--accent-green)] bg-[var(--accent-green-dim)] border-l-2 border-[var(--accent-green)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-l-2 border-transparent'
                }`}
              >
                <span className={isActive ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-[var(--border-default)] space-y-3">
        <Link href="/register">
          <TruvaButton variant="outlined" className="w-full text-[9px]">
            DEPLOY_NEW_AGENT
          </TruvaButton>
        </Link>
        <div className="space-y-1">
          <Link
            href="/sdk-docs"
            className="flex items-center gap-2 px-1 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <FileText size={13} /> DOCS
          </Link>
          <Link
            href="#"
            className="flex items-center gap-2 px-1 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <HelpCircle size={13} /> SUPPORT
          </Link>
        </div>
      </div>
    </aside>
  );
}
