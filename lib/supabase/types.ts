export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          name: string;
          public_key: string;
          operator_name: string;
          operator_email: string;
          description: string | null;
          task_type: string;
          trust_score: number;
          tier: number;
          max_tx_size: number;
          rate_limit: number;
          tasks_completed: number;
          tasks_failed: number;
          success_rate: number;
          is_active: boolean;
          is_flagged: boolean;
          chains: string[];
          pda_address: string | null;
          metadata: Json;
          registered_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          public_key: string;
          operator_name: string;
          operator_email: string;
          description?: string | null;
          task_type: string;
          trust_score?: number;
          tier?: number;
          max_tx_size?: number;
          rate_limit?: number;
          tasks_completed?: number;
          tasks_failed?: number;
          success_rate?: number;
          is_active?: boolean;
          is_flagged?: boolean;
          chains?: string[];
          pda_address?: string | null;
          metadata?: Json;
          registered_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          public_key?: string;
          operator_name?: string;
          operator_email?: string;
          description?: string | null;
          task_type?: string;
          trust_score?: number;
          tier?: number;
          max_tx_size?: number;
          rate_limit?: number;
          tasks_completed?: number;
          tasks_failed?: number;
          success_rate?: number;
          is_active?: boolean;
          is_flagged?: boolean;
          chains?: string[];
          pda_address?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          agent_id: string;
          session_id: string;
          tx_type: string;
          amount: number;
          token: string;
          recipient: string | null;
          status: string;
          block_reason: string | null;
          latency_ms: number | null;
          checks_passed: string[] | null;
          checks_failed: string[] | null;
          zk_proof: string | null;
          chain: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          session_id: string;
          tx_type: string;
          amount: number;
          token?: string;
          recipient?: string | null;
          status: string;
          block_reason?: string | null;
          latency_ms?: number | null;
          checks_passed?: string[] | null;
          checks_failed?: string[] | null;
          zk_proof?: string | null;
          chain?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
          block_reason?: string | null;
          latency_ms?: number | null;
          checks_passed?: string[] | null;
          checks_failed?: string[] | null;
          zk_proof?: string | null;
        };
      };
      trustgate_logs: {
        Row: {
          id: string;
          agent_id: string;
          agent_name: string;
          session_id: string;
          action: string;
          status: string;
          latency_ms: number;
          block_reason: string | null;
          check_results: Json;
          amount: number | null;
          token: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          agent_name: string;
          session_id: string;
          action: string;
          status: string;
          latency_ms: number;
          block_reason?: string | null;
          check_results?: Json;
          amount?: number | null;
          token?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          block_reason?: string | null;
          check_results?: Json;
        };
      };
      reputation_events: {
        Row: {
          id: string;
          agent_id: string;
          event_type: string;
          score_delta: number;
          score_after: number;
          validator_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          event_type: string;
          score_delta: number;
          score_after: number;
          validator_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          score_delta?: number;
          score_after?: number;
          note?: string | null;
        };
      };
      attestations: {
        Row: {
          id: string;
          agent_id: string;
          validator_address: string;
          attestation_type: string;
          signature: string;
          valid_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          validator_address: string;
          attestation_type: string;
          signature: string;
          valid_until?: string | null;
          created_at?: string;
        };
        Update: {
          valid_until?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          from_agent_id: string;
          to_agent_id: string;
          task_id: string;
          amount: number;
          token: string;
          status: string;
          work_verified: boolean;
          zk_proof: string | null;
          released_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_agent_id: string;
          to_agent_id: string;
          task_id: string;
          amount: number;
          token?: string;
          status?: string;
          work_verified?: boolean;
          zk_proof?: string | null;
          released_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: string;
          work_verified?: boolean;
          zk_proof?: string | null;
          released_at?: string | null;
        };
      };
    };
  };
}
