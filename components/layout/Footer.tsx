import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span className="font-mono text-xs tracking-wider text-white">TRUVA PROTOCOL</span>
          <div className="flex items-center gap-6">
            {['DOCUMENTATION', 'AGENT_REGISTRY', 'VALIDATION_LOG', 'PRIVACY'].map((label) => (
              <Link key={label} href="#" className="font-mono text-[10px] tracking-widest text-[#555] transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 text-center font-mono text-[10px] tracking-wider text-[#333]">
          &copy; 2026 TRUVA PROTOCOL &middot; SYSTEM_STATUS: OPERATIONAL
        </div>
      </div>
    </footer>
  );
}
