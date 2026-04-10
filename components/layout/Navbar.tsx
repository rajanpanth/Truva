'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'PROTOCOL' },
  { href: '/dashboard/trustgate', label: 'ORACLES' },
  { href: '/dashboard/agents', label: 'LEDGER' },
  { href: '/dashboard/demo', label: 'SECURITY' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1E3A5F]/30 bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <span className="font-mono text-lg font-bold tracking-wider text-white">TRUVA</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'font-mono text-xs tracking-widest transition-colors',
                pathname === link.href
                  ? 'text-[#00ff88]'
                  : 'text-[#888] hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="hidden rounded border border-[#00ff88]/40 bg-transparent px-4 py-1.5 font-mono text-xs tracking-wider text-[#00ff88] transition-colors hover:bg-[#00ff88]/10 md:block"
        >
          TERMINAL_ACCESS
        </Link>

        <button
          className="text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#1E3A5F]/30 bg-[#0a0a0a] px-4 pb-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'block px-3 py-2 font-mono text-xs tracking-widest',
                pathname === link.href ? 'text-[#00ff88]' : 'text-[#888]'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="mt-3 block rounded border border-[#00ff88]/40 px-4 py-1.5 text-center font-mono text-xs text-[#00ff88]"
          >
            TERMINAL_ACCESS
          </Link>
        </div>
      )}
    </nav>
  );
}
