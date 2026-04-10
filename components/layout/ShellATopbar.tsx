'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Settings } from 'lucide-react';
import { TruvaButton } from '@/components/ui/truva';

const navItems = [
  { label: 'SOLUTIONS', href: '/validator' },
  { label: 'DEVELOPERS', href: '/sdk-docs' },
  { label: 'MARKETPLACE', href: '/registry' },
  { label: 'ANALYTICS', href: '/live-demo' },
];

export function ShellATopbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[var(--bg-base)] border-b border-[var(--border-default)] flex items-center px-4">
      <Link href="/" className="flex items-center shrink-0 mr-8">
        <img
          src="/assets/logo/truva-logo.png"
          alt="TRUVA"
          className="site-logo"
        />
      </Link>

      <nav className="flex items-center gap-6 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`text-[11px] uppercase tracking-[2px] font-medium pb-0.5 transition-colors ${
                isActive
                  ? 'text-[var(--accent-green)] border-b-2 border-[var(--accent-green)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Camera size={16} />
        </button>
        <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <Settings size={16} />
        </button>
        <TruvaButton variant="outlined" className="text-[9px] px-3 py-1.5">
          LAUNCH_TERMINAL
        </TruvaButton>
      </div>
    </header>
  );
}
