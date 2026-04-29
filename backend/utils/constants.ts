export const TRUST_TIER_LABELS: Record<number, string> = {
  0: 'Bronze',
  1: 'Silver',
  2: 'Gold',
  3: 'Platinum',
};

export const TRUST_TIER_COLORS: Record<number, string> = {
  0: '#CD7F32',
  1: '#C0C0C0',
  2: '#FFD700',
  3: '#E5E4E2',
};

export const TIER_MIN_SCORES: Record<number, number> = {
  0: 0,
  1: 50,
  2: 80,
  3: 95,
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  trading: 'Trading',
  yield: 'Yield Farming',
  data: 'Data Oracle',
  execution: 'Execution',
  risk: 'Risk Management',
  treasury: 'Treasury',
  monitoring: 'Monitoring',
  payment: 'Payment',
};

export const STATUS_COLORS = {
  passed: '#00C896',
  blocked: '#FF4757',
  pending: '#FF6B35',
  escrowed: '#2196F3',
  released: '#00C896',
  refunded: '#FF6B35',
} as const;

export const ENFORCEMENT_CHECKS = [
  'TrustGate',
  'TxAuth',
  'ReputaScore',
  'WorkPay',
  'OnChainGate',
  'RiskGuard',
  'ZKProof',
  'AgentStandard',
  'ChainPort',
  'FastEnforce',
] as const;

export const CHAINS = ['solana', 'ethereum', 'base', 'arbitrum'] as const;
