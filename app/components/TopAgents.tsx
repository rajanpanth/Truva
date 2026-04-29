"use client";

import Link from "next/link";
import { TrustBadge } from "./TrustBadge";
import { useAgents } from "@/lib/hooks/useAgents";
import { TIER_LABELS } from "@/backend/types/agent";
import type { Agent } from "@/backend/types/agent";

function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = months[startOfWeek.getMonth()];
  const endMonth = months[endOfWeek.getMonth()];
  const year = endOfWeek.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth}_${startOfWeek.getDate()}-${endOfWeek.getDate()}_${year}`;
  }
  return `${startMonth}_${startOfWeek.getDate()}-${endMonth}_${endOfWeek.getDate()}_${year}`;
}

export function TopAgents() {
  const { data: agents = [], isLoading } = useAgents();
  const sorted = [...agents].sort((a: Agent, b: Agent) => b.trust_score - a.trust_score);
  const topAgent = sorted[0];
  const runners = sorted.slice(1, 3);

  const tierColor: Record<string, string> = {
    Platinum: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    Gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Silver: "text-slate-300 bg-slate-400/10 border-slate-400/20",
    Bronze: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  };

  if (isLoading || !topAgent) {
    return (
      <div className="card w-full p-5 md:p-7 bg-[#0a0a0a] border-white/[0.08] rounded-[4px] animate-pulse">
        <div className="h-8 bg-zinc-900 rounded mb-4 w-2/3" />
        <div className="h-32 bg-zinc-900 rounded mb-3" />
        <div className="h-16 bg-zinc-900 rounded mb-3" />
        <div className="h-16 bg-zinc-900 rounded" />
      </div>
    );
  }

  const topTierName = TIER_LABELS[topAgent.tier];

  return (
    <div className="card w-full p-5 md:p-7 bg-[#0a0a0a] border-white/[0.08] rounded-[4px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 border-b border-white/[0.1] pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[14px] font-mono font-bold text-[#14F195] tracking-widest uppercase">
            [HIGHEST_REPUTATION_NODE]
          </h2>
          <p className="text-[13px] font-mono text-zinc-500 tracking-widest uppercase">
            SYS_TIME: {getWeekRange()}
          </p>
        </div>
        <Link href="/registry" className="flex items-center gap-2 text-[13px] font-mono font-bold text-zinc-500 hover:text-[#14F195] transition-colors tracking-widest uppercase">
          VIEW_ALL_NODES
          <span className="text-[#14F195]">&gt;&gt;</span>
        </Link>
      </div>

      {/* ── #1 Featured ── */}
      <Link href={`/agent/${topAgent.id}`}>
        <div className="border border-[#14F195]/30 bg-[#050505] p-5 transition-all hover:border-[#14F195] group relative overflow-hidden">
          {/* Subtle grid bg */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(#14F195 1px, transparent 1px), linear-gradient(90deg, #14F195 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
          
          <div className="relative flex items-center justify-between mb-6 border-b border-white/[0.05] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono font-bold tracking-widest text-[#14F195]">RANK::01</span>
              <span className={`ml-2 px-1.5 py-0.5 text-[12px] font-bold border uppercase tracking-wider ${tierColor[topTierName]}`}>
                {topTierName}
              </span>
            </div>
            
            <div className="text-[12px] font-mono font-bold text-white flex items-center gap-2">
              <span className="text-zinc-500">TRUST_SCORE //</span>
              <span className="text-[#14F195]">{topAgent.trust_score}</span>
            </div>
          </div>

          <div className="relative flex items-center gap-5 mb-5">
            <div className="w-20 h-20 bg-zinc-900 border border-white/[0.1] flex items-center justify-center text-3xl font-mono font-black text-white shrink-0">
              {topAgent.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[22px] font-bold text-white leading-tight mb-1.5">{topAgent.name}</h3>
              <p className="text-[14px] text-zinc-400 leading-snug">{topAgent.description ?? topAgent.task_type}</p>
            </div>
          </div>

          <div className="border border-white/[0.1] bg-[#0a0a0a] px-4 py-3 flex items-center justify-between relative">
            <span className="text-[13px] font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#14F195] inline-block animate-pulse"></span>
              {topAgent.task_type}
            </span>
            <span className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">
              RATE // <span className="text-[#14F195] font-bold">{topAgent.success_rate != null ? `${(topAgent.success_rate * 100).toFixed(1)}%` : '—'}</span>
            </span>
          </div>
        </div>
      </Link>

      {/* ── Runners-up ── */}
      <div className="mt-4 flex flex-col gap-3">
        {runners.map((agent: Agent, index: number) => {
          const tierName = TIER_LABELS[agent.tier];
          return (
            <Link key={agent.id} href={`/agent/${agent.id}`}>
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
                    <span className={`shrink-0 px-1.5 py-0.5 text-[8px] font-bold border uppercase tracking-wider ${tierColor[tierName]}`}>
                      {tierName}
                    </span>
                  </div>
                  <p className="text-[13px] text-zinc-500 truncate font-mono uppercase">{agent.description ?? agent.task_type}</p>
                </div>
                <div className="text-[13px] font-mono font-bold text-white flex flex-col items-end gap-1 shrink-0">
                  <span className="text-zinc-600 text-[8px] tracking-widest">SCORE</span>
                  <span className="text-[#14F195]">{agent.trust_score}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
