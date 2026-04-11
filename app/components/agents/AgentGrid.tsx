'use client';

import { Agent } from '@/backend/types/agent';
import { AgentCard } from '@/components/agents/AgentCard';

interface AgentGridProps {
  agents: Agent[] | undefined;
  isLoading: boolean;
}

export function AgentGrid({ agents, isLoading }: AgentGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded border border-[#1a1a1a] bg-[#0d0d0d]" />
        ))}
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="font-mono text-[10px] tracking-widest text-[#555]">NO_AGENTS_FOUND</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
