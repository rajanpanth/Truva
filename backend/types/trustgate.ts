import { EnforcementCheck } from './enforcement';

export interface TrustGateLog {
  id: string;
  agent_id: string;
  agent_name: string;
  session_id: string;
  action: string;
  status: 'passed' | 'blocked';
  latency_ms: number;
  block_reason?: string;
  check_results: Record<string, EnforcementCheck>;
  amount?: number;
  token?: string;
  created_at: string;
}
