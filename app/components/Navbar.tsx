"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/lib/store/agentStore";

const NAV_LINKS = [
  { label: "Registry", href: "/registry", disabled: false },
  { label: "Docs", href: "/sdk-docs", disabled: false },
  { label: "SDK", href: "/sdk-docs", disabled: false },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useAgentStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push("/registry");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#000]/90 backdrop-blur-xl border-b border-white/[0.05]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 flex items-center justify-between h-[56px]">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <img src="/mainlogo.png" alt="TRUVA Logo" className="w-9 h-9 rounded-lg object-contain" />
          <span className="text-[14px] font-extrabold text-white tracking-tight hidden sm:block">
            TRUVA
          </span>
        </Link>

        {/* Center: Navigation & Search */}
        <div className="hidden md:flex items-center gap-1 xl:gap-2">
          {NAV_LINKS.map((link) =>
            link.disabled ? (
              <span key={link.label} className="px-3.5 py-1.5 text-[14px] font-semibold text-zinc-600 cursor-default">{link.label}</span>
            ) : (
              <Link key={link.label} href={link.href} className="px-3.5 py-1.5 text-[14px] font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all">{link.label}</Link>
            )
          )}
          
          {/* Command Line Style Search */}
          <form onSubmit={handleSearch} className="ml-2 relative flex items-center shadow-[0_0_15px_rgba(20,241,149,0.03)] focus-within:shadow-[0_0_20px_rgba(20,241,149,0.1)] transition-all rounded-md">
            <div className="absolute left-3 text-[#14F195] font-mono text-[12px] font-bold">
              &gt;
            </div>
            <input 
              type="text" 
              placeholder="Search registry..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[240px] lg:w-[320px] bg-[#0a0a0a] border border-white/[0.1] rounded-md py-1.5 pl-8 pr-12 text-[13px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#14F195]/80 transition-all"
            />
            <div className="absolute right-3 flex items-center">
              <span className="text-[10px] font-bold text-[#14F195] bg-[#14F195]/10 border border-[#14F195]/20 rounded px-1.5 py-0.5">/</span>
            </div>
          </form>
        </div>

        {/* Right: CTA */}
        <div className="flex items-center gap-3">
          <Link href="/register" className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-black bg-[#14F195] rounded-md hover:shadow-[0_0_20px_rgba(20,241,149,0.2)] transition-all">
            <span>Register Agent</span>
          </Link>
          <button className="w-8 h-8 rounded-full border border-white/[0.1] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>
          <button className="md:hidden flex flex-col gap-[4px] p-1.5" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className="w-4 h-[1.5px] bg-white rounded-full" />
            <span className="w-4 h-[1.5px] bg-white rounded-full" />
            <span className="w-3 h-[1.5px] bg-white rounded-full" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.05] bg-[#0a0a0a] px-5 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) =>
            link.disabled ? (
              <span key={link.label} className="py-2 text-[13px] text-zinc-600">{link.label}</span>
            ) : (
              <Link key={link.label} href={link.href} className="py-2 text-[13px] text-zinc-400 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>{link.label}</Link>
            )
          )}
        </div>
      )}
    </nav>
  );
}
