"use client";

const tiers = [
  {
    emoji: "🥉",
    name: "Bronze",
    bg: "bg-orange-500/[0.03]",
    border: "border-orange-500/10",
    dot: "bg-orange-500",
    req: "Score 0–49 · Registered identity",
    perks: ["Basic API access", "Testnet operations", "5 SOL tx limit"],
  },
  {
    emoji: "🥈",
    name: "Silver",
    bg: "bg-slate-400/[0.03]",
    border: "border-slate-400/10",
    dot: "bg-slate-400",
    req: "Score 50–79 · 30+ verified txns",
    perks: ["Standard payment flows", "Cross-agent messaging", "100 SOL tx limit"],
  },
  {
    emoji: "🥇",
    name: "Gold",
    bg: "bg-[#14F195]/[0.02]",
    border: "border-[#14F195]/20",
    dot: "bg-[#14F195]",
    popular: true,
    req: "Score ≥ 80 + ZK proof completion",
    perks: ["High-value DeFi interactions", "Agent-to-agent hiring", "1000 SOL tx limit"],
  },
];

export function TrustTiers() {
  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`card relative p-6 text-center ${tier.bg} ${tier.popular ? "!border-[#14F195]/20 shadow-[0_0_40px_rgba(20,241,149,0.04)]" : ""}`}
          >
            {tier.popular && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[12px] font-bold tracking-widest px-3 py-1 bg-[#14F195] text-black rounded-full">
                PREMIUM
              </div>
            )}
            <div className="text-2xl mb-3 mt-1">{tier.emoji}</div>
            <h3 className="text-[15px] font-extrabold text-white mb-1">{tier.name}</h3>
            <p className="text-[13px] text-zinc-600 mb-4">{tier.req}</p>
            <div className="space-y-0">
              {tier.perks.map((perk) => (
                <div key={perk} className="py-2 border-t border-white/[0.04] text-[13px] text-zinc-500">{perk}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
