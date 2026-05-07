"use client";

import type { TrustTier } from "@/lib/mockData";

const tierStyles: Record<TrustTier, string> = {
  Bronze: "bg-orange-500/8 text-orange-400 border-orange-500/20",
  Silver: "bg-slate-400/8 text-slate-400 border-slate-400/20",
  Gold: "bg-yellow-400/8 text-yellow-400 border-yellow-400/20",
};

export function TrustBadge({ tier }: { tier: TrustTier }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-[2px] text-[12px] font-bold tracking-widest rounded-md border ${tierStyles[tier]}`}
    >
      {tier.toUpperCase()}
    </span>
  );
}
