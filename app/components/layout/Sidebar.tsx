'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Shield,
  Activity,
  Settings,
  HelpCircle,
  ScrollText,
  Eye,
  Globe,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'AGENT_REGISTRY', icon: Bot },
  { href: '/dashboard/trustgate', label: 'TRUSTGATE_LOGS', icon: Shield },
  { href: '/dashboard/demo', label: 'LIVE_DEMO', icon: Activity },
  { href: '/dashboard/validator', label: 'VALIDATOR', icon: Eye },
  { href: '/dashboard/reputation', label: 'REPUTATION', icon: Globe },
  { href: '/dashboard/sdk', label: 'SDK_DOCS', icon: FileCode },
];

const bottomLinks = [
  { href: '#', label: 'SETTINGS', icon: Settings },
  { href: '#', label: 'SUPPORT', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-shrink-0 border-r border-[#2a3f52] bg-[#0a0a0a] lg:block">
      <div className="flex h-full flex-col">
        {/* Node info */}
        <div className="border-b border-[#2a3f52] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#2a3f52] bg-[#111]">
              <Shield className="h-4 w-4 text-[#00ff88]" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-white">NODE_001</p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
                <span className="font-mono text-[13px] tracking-wider text-[#555]">SOLANA_MAINNET</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 p-2">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2.5 rounded px-3 py-2 font-mono text-[13px] tracking-wider transition-colors',
                  isActive
                    ? 'bg-[#00ff88]/10 text-[#00ff88]'
                    : 'text-[#555] hover:bg-[#111] hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-[#2a3f52] p-2">
          <Link
            href="/dashboard/agents/register"
            className="flex w-full items-center justify-center gap-2 rounded border border-[#00ff88]/30 bg-[#00ff88]/5 px-3 py-2 font-mono text-[13px] font-bold tracking-wider text-[#00ff88] transition-colors hover:bg-[#00ff88]/10"
          >
            <ScrollText className="h-3.5 w-3.5" />
            DEPLOY_AGENT
          </Link>
          <div className="mt-2 space-y-0.5">
            {bottomLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-2.5 rounded px-3 py-1.5 font-mono text-[13px] tracking-wider text-[#444] hover:text-[#888]"
                >
                  <Icon className="h-3 w-3" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
