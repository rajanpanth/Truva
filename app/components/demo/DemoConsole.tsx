'use client';

import { useDemoStore } from '@/lib/store/demoStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

export function DemoConsole() {
  const { checkResults, currentPhase } = useDemoStore();

  return (
    <div className="rounded border border-[#2a3f52] bg-[#0d0d0d]">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-[#2a3f52] px-4 py-2">
        <span className="font-mono text-[13px] tracking-widest text-[#555]">TRUVA_KERNEL_LOGGER</span>
        {currentPhase !== null && (
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
            <span className="font-mono text-[13px] text-[#555]">PROCESSING</span>
          </div>
        )}
      </div>

      <ScrollArea className="h-[360px] p-4 font-mono text-xs">
        {checkResults.length === 0 ? (
          <div className="space-y-1 text-[#444]">
            <p>{'>'} TRUVA_ENFORCEMENT_ENGINE v2.4.1</p>
            <p>{'>'} Awaiting enforcement run...</p>
            <p>{'>'} Click LAUNCH_ATTACK to simulate rogue agent.</p>
            <p className="animate-pulse text-[#00ff88]">█</p>
          </div>
        ) : (
          <AnimatePresence>
            {checkResults.map((result, i) => (
              <motion.div
                key={`${result.name}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: i * 0.04 }}
                className="mb-1.5 flex items-center gap-3"
              >
                <span className="text-[#444]">[{String(i + 1).padStart(2, '0')}]</span>
                <span className={result.passed ? 'text-[#00ff88]' : 'text-[#ff4444]'}>
                  {result.passed ? 'PASS' : 'FAIL'}
                </span>
                <span className="text-white">{result.name}</span>
                {result.latency_ms != null && (
                  <span className="text-[#555]">{result.latency_ms}ms</span>
                )}
                {result.reason && (
                  <span className="text-[#555]">→ {result.reason}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
