'use client';

import { Shield, Zap, Clock } from 'lucide-react';
import { useDemoStore } from '@/lib/store/demoStore';

export function ZKProofVisualizer() {
  const { checkResults, latencies } = useDemoStore();
  const hasRun = checkResults.length > 0;
  const passCount = checkResults.filter((r) => r.passed).length;
  const failCount = checkResults.filter((r) => !r.passed).length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded border border-[#1a1a1a] bg-[#0d0d0d] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#00ff88]" />
          <span className="font-mono text-[10px] tracking-widest text-[#555]">CHECKS_PASSED</span>
        </div>
        <p className="font-mono text-3xl font-bold text-[#00ff88]">
          {hasRun ? `${passCount}/${checkResults.length}` : '--'}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[#444]">ENFORCEMENT_RESULTS</p>
      </div>

      <div className="rounded border border-[#1a1a1a] bg-[#0d0d0d] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#ff4444]" />
          <span className="font-mono text-[10px] tracking-widest text-[#555]">VIOLATIONS</span>
        </div>
        <p className="font-mono text-3xl font-bold text-[#ff4444]">
          {hasRun ? failCount : '--'}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[#444]">BLOCKED_OPERATIONS</p>
      </div>

      <div className="rounded border border-[#1a1a1a] bg-[#0d0d0d] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#888]" />
          <span className="font-mono text-[10px] tracking-widest text-[#555]">TOTAL_LATENCY</span>
        </div>
        <p className="font-mono text-3xl font-bold text-white">
          {latencies.total ? `${latencies.total}ms` : '--'}
        </p>
        <p className="mt-1 font-mono text-[10px] text-[#444]">END_TO_END_PIPELINE</p>
      </div>
    </div>
  );
}
