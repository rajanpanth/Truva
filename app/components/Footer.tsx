"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-[#050505] mt-20">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-8">
          <div className="max-w-[260px]">
            <div className="flex items-center gap-2 mb-3">
              <Image src="/mainlogo.png" alt="TRUVA Logo" width={36} height={36} className="rounded-lg object-contain" />
              <span className="text-[14px] font-extrabold text-white tracking-tight">TRUVA</span>
            </div>
            <p className="text-[12px] text-zinc-600 leading-relaxed">
              Building the trust infrastructure for the agentic economy. Discover, validate, and
              scale AI agents through programmable trust on Solana.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[13px] font-bold text-zinc-500 tracking-widest uppercase mb-1">Protocol</h4>
              <Link href="/" className="text-[13px] text-zinc-600 hover:text-accent transition-colors">Registry</Link>
              <Link href="/demo" className="text-[13px] text-zinc-600 hover:text-accent transition-colors">TrustGate</Link>
              <span className="text-[13px] text-zinc-600">Trust Tiers</span>
              <span className="text-[13px] text-zinc-600">SDK</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[13px] font-bold text-zinc-500 tracking-widest uppercase mb-1">Resources</h4>
              <span className="text-[13px] text-zinc-600">Documentation</span>
              <span className="text-[13px] text-zinc-600">API Reference</span>
              <span className="text-[13px] text-zinc-600">GitHub</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[13px] font-bold text-zinc-500 tracking-widest uppercase mb-1">Community</h4>
              <span className="text-[13px] text-zinc-600">Twitter / X</span>
              <span className="text-[13px] text-zinc-600">Telegram</span>
              <span className="text-[13px] text-zinc-600">Discord</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-white/[0.05] text-[13px] text-zinc-700 gap-2">
          <span>© 2026 TRUVA. All rights reserved.</span>
          <span>Built on Solana · Colosseum Frontier Hackathon</span>
        </div>
      </div>
    </footer>
  );
}
