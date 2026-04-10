'use client';

import { useDemoStore } from '@/lib/store/demoStore';
import { AlertTriangle, Ban, ArrowUpCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const phases = [
  {
    id: 0,
    label: 'ROGUE_AGENT_ATTEMPT',
    desc: 'Unauthorized payment request detected from unverified agent',
    icon: AlertTriangle,
    color: '#ff4444',
  },
  {
    id: 1,
    label: 'PAYMENT_BLOCKED',
    desc: 'Transaction halted: trust score below minimum threshold',
    icon: Ban,
    color: '#ff8800',
  },
  {
    id: 2,
    label: 'BONDING_UPGRADE',
    desc: 'Agent required to stake additional 10,000 TRU tokens',
    icon: ArrowUpCircle,
    color: '#00ff88',
  },
  {
    id: 3,
    label: 'ZK_PROOF_SUBMISSION',
    desc: 'Zero-knowledge proof submitted and verified on-chain',
    icon: Shield,
    color: '#00ff88',
  },
];

export function PhaseTracker() {
  const { currentPhase } = useDemoStore();

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {phases.map((phase) => {
        const Icon = phase.icon;
        const done = currentPhase !== null && phase.id < currentPhase;
        const active = currentPhase === phase.id;
        return (
          <div
            key={phase.id}
            className={cn(
              'rounded border bg-[#0d0d0d] p-4 transition-colors',
              active ? 'border-[#00ff88]' : 'border-[#1a1a1a]'
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <Icon
                className="h-4 w-4"
                style={{ color: done || active ? phase.color : '#333' }}
              />
              <span className="font-mono text-[10px] tracking-widest text-[#555]">
                PHASE_{phase.id + 1}
              </span>
            </div>
            <p className={cn(
              'font-mono text-xs font-bold',
              done || active ? 'text-white' : 'text-[#555]'
            )}>
              {phase.label}
            </p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-[#444]">{phase.desc}</p>
            {active && (
              <div className="mt-3 h-0.5 w-full overflow-hidden rounded bg-[#1a1a1a]">
                <div className="h-full w-1/2 animate-pulse rounded bg-[#00ff88]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
