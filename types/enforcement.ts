export interface EnforcementCheck {
  name: string;
  passed: boolean;
  latency_ms: number;
  reason?: string;
}

export interface EnforcementResult {
  allowed: boolean;
  total_latency_ms: number;
  session_id: string;
  checks: Record<string, EnforcementCheck>;
  block_reason?: string;
  zk_proof?: string;
}

export interface TransactionRequest {
  agent_id: string;
  tx_type: string;
  amount: number;
  token: string;
  recipient?: string;
  task_id?: string;
  work_proof?: string;
  chain: string;
}
