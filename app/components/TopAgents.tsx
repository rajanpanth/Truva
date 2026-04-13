"use client";

import { MOCK_AGENTS } from "@/lib/mockData";
import Link from "next/link";
import { TrustBadge } from "./TrustBadge";

export function TopAgents() {
  const topAgent = MOCK_AGENTS[0];
  const runners = MOCK_AGENTS.slice(1, 3);

  const tierColor: Record<string, string> = {
    Gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Silver: "text-slate-300 bg-slate-400/10 border-slate-400/20",
    Bronze: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  };

  return (
    <div className="card w-full p-5 md:p-7 bg-[#0a0a0a] border-white/[0.08] rounded-[4px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 border-b border-white/[0.1] pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-mono font-bold text-[#14F195] tracking-widest uppercase">
            [HIGHEST_REPUTATION_NODE]
          </h2>
          <p className="text-[13px] font-mono text-zinc-500 tracking-widest uppercase">
            SYS_TIME: Apr_6-12_2026
          </p>
        </div>
        <Link href="#" className="flex items-center gap-2 text-[13px] font-mono font-bold text-zinc-500 hover:text-[#14F195] transition-colors tracking-widest uppercase">
          VIEW_ALL_NODES
          <span className="text-[#14F195]">&gt;&gt;</span>
        </Link>
      </div>

      {/* ── #1 Featured ── */}
      <Link href={`/agent/${topAgent.pubkey}`}>
        <div className="border border-[#14F195]/30 bg-[#050505] p-5 transition-all hover:border-[#14F195] group relative overflow-hidden">
          {/* Subtle grid bg */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(#14F195 1px, transparent 1px), linear-gradient(90deg, #14F195 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          
          <div className="relative flex items-center justify-between mb-6 border-b border-white/[0.05] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono font-bold tracking-widest text-[#14F195]">RANK::01</span>
              <span className={`ml-2 px-1.5 py-0.5 text-[12px] font-bold border uppercase tracking-wider ${tierColor[topAgent.tier]}`}>
                {topAgent.tier}
              </span>
            </div>
            
            <div className="text-[12px] font-mono font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500">TRUST_SCORE //</span>
              <span className="text-[#14F195]">{topAgent.trustScore}</span>
            </div>
          </div>

          <div className="relative flex items-center gap-5 mb-5">
            <div className="w-20 h-20 bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-3xl font-mono font-black text-white shrink-0">
              {topAgent.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[22px] font-bold text-white leading-tight mb-1.5">{topAgent.name}</h3>
              <p className="text-[14px] text-zinc-400 leading-snug">{topAgent.description}</p>
            </div>
          </div>

          <div className="border border-white/[0.1] bg-[#0a0a0a] px-4 py-3 flex items-center justify-between relative">
            <span className="text-[13px] font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#14F195] inline-block animate-pulse"></span>
              {topAgent.category}
            </span>
            <span className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">
              TXNS // <span className="text-[#14F195] font-bold">{topAgent.transactionCount}</span>
            </span>
          </div>
        </div>
      </Link>

      {/* ── Runners-up ── */}
      <div className="mt-4 flex flex-col gap-3">
        {runners.map((agent, index) => {
          
          return (
            <Link key={agent.pubkey} href={`/agent/${agent.pubkey}`}>
              <div className="border border-white/[0.06] bg-[#050505] p-4 flex items-center gap-4 transition-all hover:border-[#14F195]/40 group">
                <div className="text-[13px] font-mono font-bold text-zinc-600 tracking-widest w-8 text-center shrink-0">
                  [0{index + 2}]
                </div>
                <div className="w-10 h-10 bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-lg font-mono font-bold text-white shrink-0">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-[15px] font-mono font-bold text-white leading-snug truncate group-hover:text-[#14F195] transition-colors">{agent.name}</h4>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[8px] font-bold border uppercase tracking-wider ${tierColor[agent.tier]}`}>
                      {agent.tier}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-500 truncate font-mono uppercase">{agent.description}</p>
                </div>
                <div className="text-[13px] font-mono font-bold text-white flex flex-col items-end gap-1 shrink-0">
                  <span className="text-zinc-600 text-[8px] tracking-widest">SCORE</span>
                  <span className="text-[#14F195]">{agent.trustScore}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
