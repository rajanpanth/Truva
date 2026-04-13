"use client";

import { useRealtimeLogs } from "@/lib/hooks/useRealtimeLogs";

const FALLBACK_LOGS = [
  { time: "2024-05-24T12:04:01Z", agent: "TRD_BOT_X_09", hash: "0x72a...f92c", status: "PASSED", latency: "12ms" },
  { time: "2024-05-24T12:03:58Z", agent: "ARB_SCAN_4", hash: "0x31b...c4a1", status: "BLOCKED", latency: "45ms" },
  { time: "2024-05-24T12:03:52Z", agent: "SENT_ANALYTICS", hash: "0x99c...331b", status: "PASSED", latency: "8ms" },
];

export function RealTimeLogs() {
  const { logs, isConnected } = useRealtimeLogs(10);

  const displayLogs = logs.length > 0
    ? logs.map((l) => ({
        time: l.created_at,
        agent: l.agent_name || l.agent_id,
        hash: l.session_id ? `${l.session_id.slice(0, 5)}...${l.session_id.slice(-4)}` : "—",
        status: l.status === "passed" ? "PASSED" : "BLOCKED",
        latency: `${l.latency_ms}ms`,
      }))
    : FALLBACK_LOGS;
  return (
    <div className="w-full mb-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-4 px-2">
        <h2 className="font-mono text-[18px] md:text-[22px] font-bold text-[#14F195] tracking-widest uppercase leading-none">
          TRUSTGATE_REAL_TIME_LOGS
        </h2>
        <div className="font-mono text-[13px] text-zinc-500 tracking-widest flex gap-4">
          <span className={isConnected ? "text-[#14F195]" : ""}>
            {isConnected ? "● LIVE" : "○ OFFLINE"}
          </span>
          <span>LOG_BUFFER: {displayLogs.length} ENTRIES</span>
        </div>
      </div>

      {/* Table */}
      <div className="w-full border-y border-white/[0.08] bg-[#050505]">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_100px_80px] px-5 py-3 border-b border-white/[0.08] text-[13px] font-mono font-bold text-zinc-600 tracking-widest uppercase">
          <span>TIMESTAMP</span>
          <span>AGENT_ID</span>
          <span>TRANSACTION_HASH</span>
          <span>STATUS</span>
          <span>LATENCY</span>
        </div>

        {/* Table Body */}
        <div className="flex flex-col">
          {displayLogs.map((log, i) => (
            <div 
              key={i} 
              className={`grid grid-cols-[1fr_1fr_1fr_100px_80px] px-5 py-3 items-center text-[12px] font-mono ${
                i !== displayLogs.length - 1 ? "border-b border-white/[0.04]" : ""
              }`}
            >
              <span className="text-zinc-400">{log.time}</span>
              <span className="text-zinc-200">{log.agent}</span>
              <span className="text-zinc-400">{log.hash}</span>
              <span className={log.status === "PASSED" ? "text-[#14F195] font-bold" : "text-red-500 font-bold"}>
                {log.status}
              </span>
              <span className="text-zinc-400">{log.latency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
