'use client';

import { useState } from 'react';
import { useTrustGateLogs } from '@/lib/hooks/useTrustGateLogs';
import { truncateAddress, formatAmount, formatTimeAgo } from '@/backend/utils/formatters';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function LogTable() {
  const [page, setPage] = useState(0);
  const [decisionFilter, setDecisionFilter] = useState<string>('all');

  const { data, isLoading } = useTrustGateLogs({
    page,
    limit: 20,
    decision: decisionFilter === 'all' ? undefined : decisionFilter,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#555]">
          ENFORCEMENT_LOGS
        </span>
        <select
          value={decisionFilter}
          onChange={(e) => { setDecisionFilter(e.target.value); setPage(0); }}
          className="border border-[#1a1a1a] bg-[#111] px-3 py-1.5 font-mono text-[11px] uppercase text-white outline-none focus:border-[#00ff88]"
        >
          <option value="all">ALL</option>
          <option value="allow">ALLOWED</option>
          <option value="block">BLOCKED</option>
        </select>
      </div>

      <div className="overflow-x-auto border border-[#1a1a1a] bg-[#0d0d0d]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {['AGENT', 'ACTION', 'AMOUNT', 'DECISION', 'LATENCY', 'CHECKS', 'TIME'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-[#555]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <div className="h-3 w-16 animate-pulse bg-[#1a1a1a]" />
                      </td>
                    ))}
                  </tr>
                ))
              : logs.map((log) => {
                  const passed = log.status === 'passed';
                  const checks = log.check_results ?? {};
                  const passedCount = Object.values(checks).filter((c) => c.passed).length;
                  const totalChecks = Object.keys(checks).length;

                  return (
                    <tr key={log.id} className="border-b border-[#1a1a1a] hover:bg-[#111]">
                      <td className="px-3 py-2 font-mono text-[11px] text-white">
                        {truncateAddress(log.agent_id)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] uppercase text-[#555]">{log.action}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-white">{formatAmount(log.amount ?? 0)}</td>
                      <td className="px-3 py-2">
                        <span className={`font-mono text-[10px] uppercase ${passed ? 'text-[#00ff88]' : 'text-[#ff4444]'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#555]">{log.latency_ms}ms</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#555]">
                        {passedCount}/{totalChecks}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[#555]">{formatTimeAgo(log.created_at)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#555]">
          {total} TOTAL_LOGS
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="border border-[#1a1a1a] bg-[#0d0d0d] p-1.5 text-white disabled:opacity-30 hover:border-[#00ff88]"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="font-mono text-[10px] text-[#555]">
            {page + 1} / {Math.max(1, totalPages)}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="border border-[#1a1a1a] bg-[#0d0d0d] p-1.5 text-white disabled:opacity-30 hover:border-[#00ff88]"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
