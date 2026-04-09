export type TrustTier = 1 | 2 | 3;
export type TaskType = 'trading' | 'yield' | 'data' | 'execution' | 'risk' | 'treasury' | 'monitoring' | 'payment';
export type AgentChain = 'solana' | 'ethereum' | 'base' | 'arbitrum';

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
  max_tx_size: number;
  rate_limit: number;
  tasks_completed: number;
  tasks_failed: number;
  success_rate: number;
  is_active: boolean;
  is_flagged: boolean;
  chains: AgentChain[];
  pda_address?: string;
  metadata: Record<string, unknown>;
  registered_at: string;
  updated_at: string;
}
