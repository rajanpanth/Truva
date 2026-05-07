// DB stores tier as 1=Bronze, 2=Silver, 3=Gold (matches migration 002 thresholds)
export type TrustTier = 1 | 2 | 3;
export type TrustTierLabel = 'Bronze' | 'Silver' | 'Gold';
export type TaskType = 'trading' | 'yield' | 'data' | 'execution' | 'risk' | 'treasury' | 'monitoring' | 'payment';
export type AgentChain = 'solana' | 'ethereum' | 'base' | 'arbitrum';
export type AgentStatus = 'active' | 'inactive' | 'flagged';

export const TIER_LABELS: Record<TrustTier, TrustTierLabel> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
};

export interface Agent {
  id: string;
  name: string;
  public_key: string;
  operator_name: string;
  operator_email: string;
  description?: string;
  task_type: TaskType;
  trust_score: number;
  tier: TrustTier;
  status: AgentStatus;
  max_tx_size: number;
  rate_limit: number;
  success_rate: number | null;
  spending_behavior?: string;
  is_active: boolean;
  is_flagged: boolean;
  flagged: boolean;
  chains: AgentChain[];
  pda?: string;
  pda_address?: string;
  tx_signature?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  registered_at?: string;
  updated_at: string;
}
