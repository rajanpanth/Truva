export interface Transaction {
  id: string;
  agent_id: string;
  session_id?: string;
  tx_type: string;
  amount: number;
  token?: string;
  recipient?: string;
  chain?: string;
  status: 'pending' | 'completed' | 'failed' | 'blocked';
  enforcement_result?: Record<string, unknown>;
  block_reason?: string;
  latency_ms?: number;
  checks_passed?: string[];
  checks_failed?: string[];
  zk_proof?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ReputationEvent {
  id: string;
  agent_id: string;
  event_type: 'success' | 'fail' | 'blocked' | 'attested';
  score_delta: number;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Payment {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  task_id: string;
  amount: number;
  token: string;
  status: 'escrowed' | 'released' | 'refunded';
  work_verified: boolean;
  zk_proof?: string;
  released_at?: string;
  created_at: string;
}

export interface Attestation {
  id: string;
  agent_id: string;
  validator_address: string;
  attestation_type: string;
  signature: string;
  valid_until?: string;
  created_at: string;
}
