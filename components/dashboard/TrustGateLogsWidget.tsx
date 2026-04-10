'use client';

import { useRealtimeLogs } from '@/lib/hooks/useRealtimeLogs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { truncateAddress, formatTimeAgo, formatAmount } from '@/backend/utils/formatters';

export function TrustGateLogsWidget() {
  const { logs } = useRealtimeLogs(20);

  return (
    <div className="rounded border border-[#1a1a1a] bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-3">
        <span className="font-mono text-[10px] tracking-widest text-[#555]">TRUSTGATE_LOGS</span>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
          <span className="font-mono text-[10px] text-[#555]">LIVE</span>
        </div>
      </div>

      <ScrollArea className="h-[360px] p-3">
        {logs.length === 0 ? (
          <p className="py-8 text-center font-mono text-[10px] text-[#444]">AWAITING_LOGS...</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => {
              const passed = log.status === 'passed';
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded border border-[#1a1a1a] bg-[#111] px-3 py-2"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-[#00ff88]' : 'bg-[#ff4444]'}`} />
                  <span className="font-mono text-[10px] text-white">{truncateAddress(log.agent_id)}</span>
                  <span className={`font-mono text-[10px] font-bold ${passed ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                    {log.status?.toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-[#555]">{log.latency_ms}ms</span>
                  <span className="ml-auto font-mono text-[10px] text-[#444]">{formatTimeAgo(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
