"use client";

import { MOCK_AGENTS } from "@/lib/mockData";

export function SpotlightBar() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-eyebrow">SPOTLIGHTS</h3>
        <span className="text-[12px] text-zinc-600 hover:text-[#14F195] transition-colors cursor-pointer">Get a Spotlight →</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-center gap-3 bg-[#0c0c0c] border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[210px] shrink-0 hover:border-white/[0.1] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-[#14F195]/10 border border-[#14F195]/20 flex items-center justify-center text-sm">🤖</div>
          <div>
            <div className="text-[12px] font-semibold text-white">{MOCK_AGENTS[0].name}</div>
            <div className="text-[10px] text-zinc-600">Upgraded to Gold tier</div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#0c0c0c] border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[210px] shrink-0 hover:border-white/[0.1] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-sm">🤖</div>
          <div>
            <div className="text-[12px] font-semibold text-white">{MOCK_AGENTS[4].name}</div>
            <div className="text-[10px] text-zinc-600">ZK proof verified</div>
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-center gap-1.5 border border-dashed border-white/[0.06] rounded-2xl px-4 py-3 min-w-[120px] shrink-0">
            <span className="text-zinc-700 text-sm">+</span>
            <span className="text-[11px] text-zinc-700">Available</span>
          </div>
        ))}
      </div>
    </section>
  );
}
