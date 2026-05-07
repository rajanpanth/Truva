'use client';

import { useAgents } from '@/lib/hooks/useAgents';
import { truncateAddress } from '@/backend/utils/formatters';
import { useState } from 'react';
import Link from 'next/link';

const tierColors: Record<string, string> = {
  gold: 'text-yellow-500',
  silver: 'text-[#888]',
  bronze: 'text-orange-600',
};

export function ConnectedAgents() {
  const [search, setSearch] = useState('');
  const { data: agents, isLoading } = useAgents({ search });

  return (
    <div className="rounded border border-[#2a3f52] bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-[#2a3f52] px-4 py-3">
        <span className="font-mono text-[13px] tracking-widest text-[#555]">CONNECTED_AGENTS</span>
        <input
          type="text"
          placeholder="SEARCH_BY_NAME..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 rounded border border-[#2a3f52] bg-[#111] px-3 py-1.5 font-mono text-[13px] text-white placeholder:text-[#333] focus:border-[#00ff88] focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a3f52]">
              {['STATUS', 'NAME', 'ADDRESS', 'TIER', 'SCORE', 'SUCCESS'].map((h) => (
                <th key={h} className="px-4 py-2 text-left font-mono text-[13px] tracking-widest text-[#444]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#2a3f52]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-3 w-16 animate-pulse rounded bg-[#1a1a1a]" />
                      </td>
                    ))}
                  </tr>
                ))
              : agents?.map((agent) => (
                  <tr key={agent.id} className="border-b border-[#2a3f52] hover:bg-[#111]">
                    <td className="px-4 py-2">
                      <span className={`h-1.5 w-1.5 inline-block rounded-full ${agent.status === 'active' ? 'bg-[#00ff88]' : agent.status === 'flagged' ? 'bg-[#ff4444]' : 'bg-[#555]'}`} />
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/dashboard/agents/${agent.id}`} className="font-mono text-[13px] font-bold text-white hover:text-[#00ff88]">
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-[13px] text-[#555]">
                      {truncateAddress(agent.public_key)}
                    </td>
                    <td className={`px-4 py-2 font-mono text-[13px] font-bold uppercase ${tierColors[agent.tier] ?? 'text-[#555]'}`}>
                      {agent.tier}
                    </td>
                    <td className="px-4 py-2 font-mono text-[13px] text-white">{agent.trust_score}</td>
                    <td className="px-4 py-2 font-mono text-[13px] text-[#555]">
                      {agent.success_rate != null ? `${agent.success_rate.toFixed(1)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
