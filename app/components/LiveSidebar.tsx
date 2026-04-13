"use client";

export function LiveSidebar() {
  return (
    <div className="w-full lg:w-[320px] flex flex-col gap-3 shrink-0">
      {/* Live Now */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="text-[#14F195] text-sm">📡</span>
            <span className="text-[13px] font-bold text-white">Live Now</span>
          </div>
          <span className="live-badge">1 LIVE</span>
        </div>
        <div className="p-4">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center text-zinc-600 text-base shrink-0">🏆</div>
            <div>
              <div className="text-[13px] font-semibold text-white">Colosseum Frontier Hackathon</div>
              <div className="text-[13px] text-zinc-600 mt-0.5">has started!</div>
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 border border-[#14F195]/30 rounded-full text-[#14F195] text-[13px] font-semibold">
                Event &middot; Apr 6 &ndash; May 11
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TrustGate Stats */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="text-[#14F195] text-sm">📊</span>
            <span className="text-[13px] font-bold text-white">TrustGate Stats</span>
          </div>
        </div>
        <div className="px-5 py-0.5">
          {[
            { label: "Tx Validated Today", value: "4,281", accent: false },
            { label: "Blocked", value: "23", accent: true },
            { label: "Avg Latency", value: "12ms", accent: false },
            { label: "ZK Proofs Verified", value: "891", accent: false },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between py-2.5 border-b border-white/[0.04] last:border-b-0 text-[12px]">
              <span className="text-zinc-600">{stat.label}</span>
              <span className={`font-semibold ${stat.accent ? "text-red-400" : "text-white"}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
