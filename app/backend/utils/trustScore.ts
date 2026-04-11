import { TrustTier } from '@/backend/types/agent';
import { TIER_MIN_SCORES } from './constants';

export function getTierFromScore(score: number): TrustTier {
  if (score >= 80) return 3;
  if (score >= 50) return 2;
  return 1;
}

export function isScoreSufficientForTier(score: number, tier: TrustTier): boolean {
  return score >= TIER_MIN_SCORES[tier];
}

export function calculateScoreDelta(
  eventType: 'task_success' | 'task_fail' | 'blocked' | 'attested',
  currentScore: number
): number {
  switch (eventType) {
    case 'task_success':
      return Math.min(3, 100 - currentScore);
    case 'task_fail':
      return -Math.min(5, currentScore);
    case 'blocked':
      return -Math.min(10, currentScore);
    case 'attested':
      return Math.min(5, 100 - currentScore);
    default:
      return 0;
  }
}

export function getScoreColor(score: number): string {
  if (score >= 70) return '#00C896';
  if (score >= 40) return '#FF6B35';
  return '#FF4757';
}
