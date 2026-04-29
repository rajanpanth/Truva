"use client";

import Link from "next/link";
import { useAgents } from "@/lib/hooks/useAgents";
import { TIER_LABELS } from "@/backend/types/agent";
import type { Agent } from "@/backend/types/agent";

const tierDot: Record<string, string> = {
  Platinum: "bg-purple-400",
  Gold: "bg-yellow-400",
  Silver: "bg-slate-400",
  Bronze: "bg-orange-400",
};

function Countdown() {
  return (
    <div className="flex items-center gap-1 text-[12px] font-mono font-bold text-zinc-400">
      <span className="countdown-segment">32d</span>
      <span className="text-zinc-700">:</span>
      <span className="countdown-segment">08h</span>
      <span className="text-zinc-700">:</span>
      <span className="countdown-segment">08m</span>
      <span className="text-zinc-700">:</span>
      <span className="countdown-segment">00s</span>
    </div>
  );
}

export function Leaderboard() {
  const { data: agents = [], isLoading } = useAgents();
  const topFive = [...agents].sort((a: Agent, b: Agent) => b.trust_score - a.trust_score).slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:max-w-[50%] gap-4">
      {/* Card 2: Trust Score Battle */}
      <div className="card overflow-hidden">
        <div className="h-[72px] bg-gradient-to-br from-yellow-400/[0.04] via-transparent to-transparent flex items-center px-5 gap-3 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-base">⚔️</div>
          <div>
            <div className="text-[13px] font-bold text-white">Trust Score Battle</div>
            <div className="text-[13px] text-zinc-600">Which agent earns Gold first?</div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06]">
          <Countdown />
          <span className="live-badge">LIVE</span>
        </div>
        <div>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2 border-b border-white/[0.04] animate-pulse">
                  <div className="w-4 h-3 bg-zinc-800 rounded" />
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  <div className="flex-1 h-3 bg-zinc-800 rounded" />
                </div>
              ))
            : topFive.map((agent: Agent, i: number) => {
                const tierName = TIER_LABELS[agent.tier];
                return (
                  <Link key={agent.id} href={`/agent/${agent.id}`}>
                    <div className={`flex items-center gap-3 px-5 py-2 row-hover group ${i < 4 ? "border-b border-white/[0.04]" : ""}`}>
                      <span className="text-[13px] font-bold text-zinc-600 w-4 text-center shrink-0">{i + 1}</span>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${tierDot[tierName] ?? "bg-zinc-600"}`} />
                      <span className="flex-1 text-[12px] font-semibold text-white group-hover:text-[#14F195] transition-colors truncate">{agent.name}</span>
                      <span className="open-link text-[13px]">↗</span>
                      <span className="text-[13px] font-bold text-[#14F195] shrink-0">🛡 {agent.trust_score}</span>
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
}
