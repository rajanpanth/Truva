/**
 * Mock agent data for the reputation engine.
 * Simulates what would come from indexing on-chain transaction history.
 */

import { ReputationInput } from "./scorer";

export interface MockAgent {
  name: string;
  publicKey: string;
  description: string;
  category: string;
  reputationInput: ReputationInput;
}

export const MOCK_AGENT_DATA: MockAgent[] = [
  {
    name: "TradeBot X",
    publicKey: "AgentA1111111111111111111111111111111111111111",
    description: "Autonomous DeFi arbitrage engine",
    category: "DEFI",
    reputationInput: {
      transactionCount: 200,
      successRate: 0.998,
    },
  },
  {
    name: "Liquid Flow",
    publicKey: "AgentB2222222222222222222222222222222222222222",
    description: "Cross-pool liquidity management",
    category: "DEFI",
    reputationInput: {
      transactionCount: 142,
      successRate: 0.942,
    },
  },
  {
    name: "Oracle Eye",
    publicKey: "AgentC3333333333333333333333333333333333333333",
    description: "Real-time price feed aggregation",
    category: "ORACLE",
    reputationInput: {
      transactionCount: 89,
      successRate: 0.885,
    },
  },
  {
    name: "Guard Proto",
    publicKey: "AgentD4444444444444444444444444444444444444444",
    description: "Smart contract security auditor",
    category: "SECURITY",
    reputationInput: {
      transactionCount: 31,
      successRate: 0.621,
    },
  },
  {
    name: "SwarmNet Alpha",
    publicKey: "AgentE5555555555555555555555555555555555555555",
    description: "Multi-agent coordination swarm",
    category: "INFRA",
    reputationInput: {
      transactionCount: 117,
      successRate: 0.917,
    },
  },
  {
    name: "SentiBot v3",
    publicKey: "AgentF6666666666666666666666666666666666666666",
    description: "Social sentiment analysis engine",
    category: "SOCIAL",
    reputationInput: {
      transactionCount: 74,
      successRate: 0.853,
    },
  },
];
