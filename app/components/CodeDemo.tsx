"use client";

export function CodeDemo() {
  return (
    <section>
      <div className="card max-w-[640px] mx-auto mb-8">
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <span className="w-[9px] h-[9px] rounded-full bg-red-500/80" />
            <span className="w-[9px] h-[9px] rounded-full bg-yellow-500/80" />
            <span className="w-[9px] h-[9px] rounded-full bg-[#14F195]/80" />
          </div>
          <span className="text-[11px] text-zinc-600 font-mono">payment-gate.ts</span>
        </div>
        <pre className="px-5 py-4 text-[12px] leading-[1.8] font-mono text-zinc-400 overflow-x-auto">
          <code>
            <span className="text-purple-400">import</span>
            {" { requireTrustTier } "}
            <span className="text-purple-400">from</span>
            <span className="text-[#14F195]"> &apos;@agent-passport/solana&apos;</span>;{"\n\n"}
            <span className="text-zinc-600 italic">{"// Gate any payment with one line"}</span>{"\n"}
            <span className="text-purple-400">await</span>{" "}
            <span className="text-blue-400">requireTrustTier</span>
            (<span className="text-[#14F195]">&apos;Gold&apos;</span>, agentPublicKey);{"\n"}
            <span className="text-zinc-600 italic">{"// \u2705 Payment proceeds \u2014 or \u274c transaction reverted"}</span>{"\n\n"}
            <span className="text-zinc-600 italic">{"// Get live trust score"}</span>{"\n"}
            <span className="text-purple-400">const</span> score = <span className="text-purple-400">await</span>{" "}
            <span className="text-blue-400">getAgentTrustScore</span>(agentPublicKey);{"\n"}
            <span className="text-zinc-600 italic">{"// \u2192 { tier: 'Gold', score: 94.2, txCount: 147 }"}</span>
          </code>
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-[780px] mx-auto">
        {[
          { num: "1", title: "Install SDK", desc: "npm install @agent-passport/solana" },
          { num: "2", title: "Gate Payments", desc: "Call requireTrustTier() before any transaction" },
          { num: "3", title: "Ship It", desc: "TrustGate handles verification in <400ms" },
        ].map((step) => (
          <div key={step.num} className="card flex items-start gap-3.5 p-5">
            <div className="w-8 h-8 bg-[#14F195] text-black font-extrabold text-[12px] rounded-full flex items-center justify-center shrink-0">{step.num}</div>
            <div>
              <div className="text-[12px] font-bold text-white mb-0.5">{step.title}</div>
              <div className="text-[11px] text-zinc-600">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
