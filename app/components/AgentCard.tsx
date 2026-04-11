"use client";

import Link from "next/link";
import type { Agent } from "@/lib/mockData";

const tierIcon: Record<string, string> = {
  Gold: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  Silver: "bg-slate-400/10 text-slate-400 border-slate-400/20",
  Bronze: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const tierLabel: Record<string, string> = {
  Gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Silver: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  Bronze: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agent/${agent.pubkey}`}>
      <div className="grid grid-cols-[1fr_120px_80px_140px] items-center px-5 py-3 row-hover border-b border-white/[0.04] group">
        {/* Col 1: Agent */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm border shrink-0 ${tierIcon[agent.tier]}`}>🤖</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white group-hover:text-[#14F195] transition-colors">{agent.name}</span>
              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500 border border-white/[0.05]">{agent.category}</span>
              <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${tierLabel[agent.tier]}`}>{agent.tier.toUpperCase()}</span>
            </div>
            <div className="text-[11px] text-zinc-600 truncate mt-0.5">{agent.description}</div>
          </div>
        </div>
        {/* Col 2: Builder */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-[10px] shrink-0">🤖</div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-zinc-400 truncate">{agent.builder || agent.name.split(' ')[0]}</div>
            <div className="text-[10px] text-zinc-700 truncate">{agent.builder || agent.name.split(' ')[0]}</div>
          </div>
        </div>
        {/* Col 3: Score */}
        <div className="flex items-center justify-end gap-2 text-right">
          <div className="trust-score-btn shrink-0 w-full justify-center">
            <span className="icon">🛡</span>
            <span>{agent.trustScore}</span>
          </div>
        </div>
        {/* Col 4: Action */}
        <div className="flex justify-end items-center pl-6">
          <span className="px-3 py-1.5 border border-white/[0.1] text-[10px] font-mono font-bold text-zinc-400 group-hover:border-[#14F195]/40 group-hover:text-[#14F195] transition-all rounded-[2px] uppercase whitespace-nowrap">
            VIEW_PASSPORT
          </span>
        </div>
      </div>
    </Link>
  );
}
