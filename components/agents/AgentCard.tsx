'use client';

import Link from 'next/link';
import { Agent } from '@/backend/types/agent';
import { truncateAddress } from '@/backend/utils/formatters';
import { TASK_TYPE_LABELS } from '@/backend/utils/constants';
import { Bot } from 'lucide-react';

const tierColors: Record<string, string> = {
  gold: 'text-yellow-500 border-yellow-500/30',
  silver: 'text-[#888] border-[#888]/30',
  bronze: 'text-orange-600 border-orange-600/30',
};

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const tc = tierColors[agent.tier] ?? 'text-[#555] border-[#555]/30';
  return (
    <Link href={`/dashboard/agents/${agent.id}`}>
      <div className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-4 transition-colors hover:border-[#00ff88]/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[#2a3f52] bg-[#111]">
              <Bot className="h-3.5 w-3.5 text-[#00ff88]" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-white">{agent.name}</p>
              <p className="font-mono text-[13px] text-[#555]">{truncateAddress(agent.public_key)}</p>
            </div>
          </div>
          <span className={`rounded border px-2 py-0.5 font-mono text-[12px] font-bold uppercase ${tc}`}>
            {agent.tier}
          </span>
        </div>

        {/* Trust score bar */}
        <div className="mb-2">
          <div className="flex justify-between">
            <span className="font-mono text-[13px] text-[#555]">TRUST_SCORE</span>
            <span className="font-mono text-[13px] text-white">{agent.trust_score}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded bg-[#1a1a1a]">
            <div
              className="h-full rounded bg-[#00ff88]"
              style={{ width: `${Math.min(agent.trust_score, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[13px] text-[#444]">
            {TASK_TYPE_LABELS[agent.task_type] ?? agent.task_type}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${agent.is_flagged ? 'bg-[#ff4444]' : agent.is_active ? 'bg-[#00ff88]' : 'bg-[#555]'}`} />
            <span className="font-mono text-[13px] text-[#555]">
              {agent.is_flagged ? 'FLAGGED' : agent.is_active ? 'ACTIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
