import { EnforcementCheck } from '@/types/enforcement';
import { Agent } from '@/types/agent';
import { TIER_MIN_SCORES } from '@/lib/utils/constants';

export async function checkReputaScore(agent: Agent): Promise<EnforcementCheck> {
  const start = Date.now();

  const minScore = TIER_MIN_SCORES[agent.tier] ?? 20;
  const passed = agent.trust_score >= minScore;

  return {
    name: 'ReputaScore',
    passed,
    latency_ms: Date.now() - start,
    reason: passed
      ? undefined
      : `Agent trust score ${agent.trust_score} below minimum ${minScore} for tier ${agent.tier}`,
  };
}
