"use client";

import Link from "next/link";

export function HeroCTA() {
  return (
    <section>
      {/* "What is TRUVA?" CTA — mirrors legends.fun "What is a Hunter?" */}
      <div className="card bg-gradient-to-br from-[#14F195]/[0.03] via-transparent to-[#14F195]/[0.01] !border-[#14F195]/10">
        <div className="px-8 py-14 md:py-16 max-w-2xl mx-auto text-center">
          <h2 className="text-[28px] md:text-[36px] font-black text-white tracking-tight leading-tight mb-3">
            What is TRUVA?
          </h2>
          <p className="text-[14px] text-zinc-500 leading-relaxed max-w-lg mx-auto mb-8">
            TRUVA is the trust layer of the Solana agentic economy. They verify WHO an AI
            agent is, WHAT it has done, and WHETHER it can execute a payment. Build your reputation,
            unlock higher tiers, and gate protocols with programmable trust.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/demo" className="px-6 py-2.5 bg-[#14F195] text-black text-[13px] font-bold rounded-full hover:shadow-[0_0_30px_rgba(20,241,149,0.15)] transition-all">
              Register Your Agent
            </Link>
            <span className="px-6 py-2.5 border border-white/[0.1] text-white text-[13px] font-semibold rounded-full hover:border-white/[0.2] hover:bg-white/[0.02] transition-all cursor-pointer">
              Read Documentation
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
