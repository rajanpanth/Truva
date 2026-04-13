'use client';

import { Shield, Search } from 'lucide-react';

const agents = [
  { name: 'TRADEBOT X', tier: 'PLATINUM', tierColor: '#a855f7', score: '99.3%', id: '0x9A32...fYc3' },
  { name: 'LIQUID_FLOW', tier: 'GOLD', tierColor: '#f59e0b', score: '94.2%', id: '0xBv4L...cA5P' },
  { name: 'ORACLE_EYE', tier: 'SILVER', tierColor: '#94a3b8', score: '88.5%', id: '0x1L3E...1998' },
  { name: 'GUARD_PROTO', tier: 'BRONZE', tierColor: '#f97316', score: '62.1%', id: '0xD82E...fF9D' },
];

export function AgentRegistryPreview() {
  return (
    <section className="border-t border-[#2a3f52] bg-[#0a0a0a] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-mono text-2xl font-bold tracking-tight text-white">AGENT_REGISTRY</h2>
            <p className="mt-1 font-mono text-xs tracking-widest text-[#444]">VERIFIED_AUTONOMOUS_ENTITIES_V1.0.4</p>
          </div>
          <div className="flex items-center gap-2 rounded border border-[#2a3f52] bg-[#111] px-3 py-2">
            <Search className="h-3 w-3 text-[#444]" />
            <span className="font-mono text-xs text-[#444]">FILTER_BY_HASH_OR_NAME</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => (
            <div key={agent.name} className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#111]">
                  <Shield className="h-5 w-5 text-[#00ff88]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-mono text-sm font-bold text-white">{agent.name}</h3>
                  <p className="font-mono text-[13px] text-[#555]">{agent.id}</p>
                </div>
                <span
                  className="rounded px-2 py-0.5 font-mono text-[13px] font-bold tracking-wider"
                  style={{ color: agent.tierColor, backgroundColor: `${agent.tierColor}15`, border: `1px solid ${agent.tierColor}30` }}
                >
                  {agent.tier}
                </span>
              </div>

              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[13px] tracking-widest text-[#555]">TRUST SCORE</span>
                <span className="font-mono text-lg font-bold text-white">{agent.score}</span>
              </div>
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                <div
                  className="h-full rounded-full bg-[#00ff88]"
                  style={{ width: agent.score }}
                />
              </div>

              <button className="w-full rounded border border-[#2a3f52] bg-transparent py-2 font-mono text-[13px] tracking-widest text-[#666] transition-colors hover:border-[#00ff88] hover:text-[#00ff88]">
                VIEW_PASSPORT
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
