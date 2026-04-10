'use client';

import { useRealtimeLogs } from '@/lib/hooks/useRealtimeLogs';
import { truncateAddress, formatAmount } from '@/backend/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

export function LogStream() {
  const { logs, isConnected } = useRealtimeLogs(50);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
          LIVE_STREAM
        </span>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'animate-pulse bg-[#00ff88]' : 'bg-[#ff4444]'}`} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
            {isConnected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="h-[500px] overflow-y-auto border border-[#1a1a1a] bg-[#0a0a0a] p-3">
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const passed = log.status === 'passed';
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-1.5 border border-[#1a1a1a] bg-[#0d0d0d] p-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`} />
                    <span className="font-mono text-[11px] text-white">
                      {truncateAddress(log.agent_id)}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-[#555]">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-white">{formatAmount(log.amount ?? 0)}</span>
                    <span className={`font-mono text-[10px] uppercase ${passed ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                      {log.status}
                    </span>
                    <span className="font-mono text-[10px] text-[#555]">{log.latency_ms}ms</span>
                  </div>
                </div>

                {log.check_results && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(log.check_results).map(([check, result]) => (
                      <span
                        key={check}
                        className={`font-mono text-[9px] uppercase px-1.5 py-0.5 ${
                          result.passed
                            ? 'bg-[#00ff88]/10 text-[#00ff88]'
                            : 'bg-[#ff4444]/10 text-[#ff4444]'
                        }`}
                      >
                        {check}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {logs.length === 0 && (
          <p className="py-12 text-center font-mono text-[11px] text-[#555]">
            AWAITING_ENFORCEMENT_EVENTS...
          </p>
        )}
      </div>
    </div>
  );
}
