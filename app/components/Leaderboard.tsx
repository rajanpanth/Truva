"use client";

import { MOCK_AGENTS } from "@/lib/mockData";
import Link from "next/link";

const tierDot: Record<string, string> = {
  Gold: "bg-yellow-400",
  Silver: "bg-slate-400",
  Bronze: "bg-orange-400",
};

const statusBadge: Record<string, string> = {
  LIVE: "live-badge",
  DEV: "dev-badge",
  IDEA: "idea-badge",
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
  const topFive = [...MOCK_AGENTS].sort((a, b) => b.trustScore - a.trustScore).slice(0, 5);
  const statuses = ["LIVE", "LIVE", "DEV", "DEV", "IDEA"];

  return (
    <div className="grid grid-cols-1 lg:max-w-[50%] gap-4">
      {/* Card 2: Trust Score Battle */}
      <div className="card overflow-hidden">
        <div className="h-[72px] bg-gradient-to-br from-yellow-400/[0.04] via-transparent to-transparent flex items-center px-5 gap-3 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center text-base">⚔️</div>
          <div>
            <div className="text-[13px] font-bold text-white">Trust Score Battle</div>
            <div className="text-[11px] text-zinc-600">Which agent earns Gold first?</div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/[0.06]">
          <Countdown />
          <span className="live-badge">LIVE</span>
        </div>
        <div>
          {topFive.map((agent, i) => (
            <Link key={agent.pubkey} href={`/agent/${agent.pubkey}`}>
              <div className={`flex items-center gap-3 px-5 py-2 row-hover group ${i < 4 ? "border-b border-white/[0.04]" : ""}`}>
                <span className="text-[11px] font-bold text-zinc-600 w-4 text-center shrink-0">{i + 1}</span>
                <div className={`w-2 h-2 rounded-full shrink-0 ${tierDot[agent.tier]}`} />
                <span className="flex-1 text-[12px] font-semibold text-white group-hover:text-[#14F195] transition-colors truncate">{agent.name}</span>
                <span className="open-link text-[10px]">↗</span>
                <span className="text-[11px] font-bold text-[#14F195] shrink-0">🛡 {agent.trustScore}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
