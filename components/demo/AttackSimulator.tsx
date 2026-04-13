'use client';

import { useState } from 'react';
import { useDemoStore } from '@/lib/store/demoStore';
import { AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function AttackSimulator() {
  const [isRunning, setIsRunning] = useState(false);
  const { setCurrentPhase, setCheckResults, setLatencies, reset } = useDemoStore();

  const launchAttack = async () => {
    setIsRunning(true);
    reset();
    setCurrentPhase(0);

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rogue_attack' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Demo request failed');
      }

      const data = await res.json();

      for (let i = 0; i < data.phases.length; i++) {
        setCurrentPhase(i);
        await new Promise((r) => setTimeout(r, 800));
      }

      if (data.enforcement_result) {
        setCheckResults(data.enforcement_result.results ?? []);
        setLatencies({ total: data.enforcement_result.total_latency_ms ?? 0 });
      }

      setCurrentPhase(null);
      toast.success('Simulation complete — agent blocked');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Simulation failed');
      setCurrentPhase(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    reset();
    toast.info('Console reset');
  };

  return (
    <div className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#ff4444]" />
        <span className="font-mono text-xs font-bold tracking-widest text-white">ATTACK_SIMULATOR</span>
      </div>

      <div className="mb-5 space-y-2 font-mono text-[13px] leading-relaxed text-[#555]">
        <p>Simulates a <span className="text-[#ff4444]">ROGUE_AGENT</span> with:</p>
        <ul className="ml-3 space-y-1">
          <li>· Trust Score: <span className="text-white">12</span></li>
          <li>· Max Tx: <span className="text-white">100 SOL</span></li>
          <li>· Attempt: <span className="text-[#ff4444]">999,999 SOL</span></li>
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          onClick={launchAttack}
          disabled={isRunning}
          className="flex flex-1 items-center justify-center gap-2 rounded bg-[#ff4444] py-2.5 font-mono text-[13px] font-bold tracking-wider text-white transition-colors hover:bg-[#ff4444]/80 disabled:opacity-50"
        >
          <Play className="h-3 w-3" />
          {isRunning ? 'RUNNING...' : 'LAUNCH_ATTACK'}
        </button>
        <button
          onClick={handleReset}
          className="rounded border border-[#2a3f52] bg-[#111] px-3 py-2.5 text-[#555] transition-colors hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
