export const TRUST_TIER_LABELS: Record<number, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
};

export const TRUST_TIER_COLORS: Record<number, string> = {
  1: '#FF4757',
  2: '#FF6B35',
  3: '#00C896',
};

export const TIER_MIN_SCORES: Record<number, number> = {
  1: 20,
  2: 40,
  3: 70,
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
