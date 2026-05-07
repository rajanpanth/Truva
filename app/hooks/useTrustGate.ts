"use client";

import { useCallback, useState } from "react";
import type { TrustTier } from "@/lib/mockData";

const TIER_RANK: Record<TrustTier, number> = {
  Bronze: 0,
  Silver: 1,
  Gold: 2,
};

interface TrustCheckResult {
  passed: boolean;
  agentTier: TrustTier;
  requiredTier: TrustTier;
  trustScore: number;
}

/**
 * Hook to simulate TrustGate checks in the frontend.
 * In production, this would call the Anchor program directly.
 */
export function useTrustGate() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<TrustCheckResult | null>(null);

  const checkTrust = useCallback(
    async (
      agentTier: TrustTier,
      agentScore: number,
      requiredTier: TrustTier
    ): Promise<TrustCheckResult> => {
      setIsLoading(true);

      // Simulate on-chain call latency
      await new Promise((r) => setTimeout(r, 500));

      const passed = TIER_RANK[agentTier] >= TIER_RANK[requiredTier];
      const result: TrustCheckResult = {
        passed,
        agentTier,
        requiredTier,
        trustScore: agentScore,
      };

      setLastResult(result);
      setIsLoading(false);
      return result;
    },
    []
  );

  return { checkTrust, isLoading, lastResult };
}
