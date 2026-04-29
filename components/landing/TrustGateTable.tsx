'use client';

const logRows = [
  { timestamp: '2026-04-29T12:04:01Z', agent: 'TRD_BOT_X_09', hash: '0x73n...f60c', status: 'PASSED', latency: '32ms' },
  { timestamp: '2026-04-29T12:05:50Z', agent: 'ARB_SCAN_4', hash: '0x3d0...e4a1', status: 'BLOCKED', latency: '45ms' },
  { timestamp: '2026-04-29T12:05:52Z', agent: 'SENTI_ANALYTICS', hash: '0x9f0...301b', status: 'PASSED', latency: '0ms' },
];

export function TrustGateTable() {
  return (
    <section className="border-t border-[#2a3f52] bg-[#0a0a0a] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-[#00ff88]" />
            <span className="font-mono text-xs font-bold tracking-widest text-[#00ff88]">
              TRUSTGATE_REAL_TIME_LOGS
            </span>
          </div>
          <span className="font-mono text-[13px] tracking-widest text-[#444]">
            ACTIVE_FILTERS: ALL &nbsp; LOG_BUFFER: 51240
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a3f52]">
                {['TIMESTAMP', 'AGENT_ID', 'TRANSACTION_HASH', 'STATUS', 'LATENCY'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[13px] tracking-[0.2em] text-[#444]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logRows.map((row, i) => (
                <tr key={i} className="border-b border-[#2a3f52]">
                  <td className="px-4 py-3 font-mono text-xs text-[#666]">{row.timestamp}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#00ff88]">{row.agent}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#555]">{row.hash}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-xs font-bold ${
                        row.status === 'PASSED' ? 'text-[#00ff88]' : 'text-[#ff4444]'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#666]">{row.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
