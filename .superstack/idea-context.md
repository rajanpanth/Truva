# Truva Protocol — Colosseum Copilot Landscape Analysis
# Generated: 2026-04-28
# Skill: colosseum-copilot v0.2.0
# API: https://copilot.colosseum.com/api/v1
# Hackathon: Colosseum Frontier 2026

## copilot_landscape

```json
{
  "queried_at": "2026-04-28",
  "token_user": "rajanpantha",
  "database_size": 5428,
  "query": "Truva Protocol — programmable trust primitive for AI agents on Solana",

  "similar_projects": [
    {
      "slug": "solana-passport",
      "name": "Solana Passport",
      "oneLiner": "ZK-powered identity verification on Solana using Reclaim Protocol to prove humanity through digital stamps.",
      "similarity": 0.062,
      "hackathon": "Radar 2024",
      "prize": null,
      "cluster": "v1-c13 — Solana Privacy and Identity Management",
      "crowdedness": 260,
      "threat": "NONE — human identity, not AI agent trust"
    },
    {
      "slug": "solana-reputation-scorer",
      "name": "Solana Reputation Scorer",
      "oneLiner": "AI-powered tool converting Solana onchain activity into mintable reputation scores for ecosystem projects.",
      "similarity": 0.059,
      "hackathon": "Breakout 2025",
      "prize": null,
      "cluster": "v1-c28 — Web3 Loyalty and Reward Platforms",
      "crowdedness": 123,
      "threat": "LOW — off-chain scoring only, NFT mint, no CPI, no payment gating"
    },
    {
      "slug": "project-plutus",
      "name": "Project Plutus",
      "oneLiner": "A platform for the simplified deployment and management of autonomous AI agents on the Solana blockchain.",
      "similarity": 0.048,
      "hackathon": "Breakout 2025",
      "prize": "2nd Place AI — $20,000",
      "cluster": "v1-c14 — Solana AI Agent Infrastructure",
      "crowdedness": 325,
      "threat": "NONE — agent deployment, not trust gating. Potential integration partner."
    },
    {
      "slug": "repaye",
      "name": "Repaye",
      "oneLiner": "Verifiable review and rating system powered by on-chain transaction history and user behavior.",
      "similarity": 0.031,
      "hackathon": "Breakout 2025",
      "prize": null,
      "cluster": "v1-c2 — Solana-based Decentralized Voting Systems",
      "crowdedness": 130,
      "threat": "LOW — human review/rating, no AI agent focus, no CPI composability"
    },
    {
      "slug": "solxpass",
      "name": "SolXpass",
      "oneLiner": "Decentralized identity and rewards platform on Solana using ZKPs for verifiable cross-category identity proofs.",
      "similarity": 0.028,
      "hackathon": "Radar 2024",
      "prize": null,
      "cluster": "v1-c28 — Web3 Loyalty and Reward Platforms",
      "crowdedness": 123,
      "threat": "NONE — ZK human identity + rewards, no agent focus"
    }
  ],

  "gap_analysis": {
    "winners_overindex": [
      {
        "dimension": "primitives",
        "key": "oracle",
        "lift": 0.27,
        "action": "Frame Helius webhook + chain-writer as oracle-grade data pipeline"
      },
      {
        "dimension": "problemTags",
        "key": "fragmented liquidity",
        "lift": 1.0,
        "action": "Position Truva as capital efficiency enabler — programmatically exclude untrusted agents"
      },
      {
        "dimension": "solutionTags",
        "key": "natural language processing",
        "lift": 0.235,
        "action": "Highlight AgentWallet elizaOS/LangChain integration"
      }
    ],
    "winners_underindex": [
      {
        "dimension": "primitives",
        "key": "nft",
        "lift": -0.66,
        "action": "Do NOT frame Passport as NFT — it is a PDA. Already correct."
      },
      {
        "dimension": "solutionTags",
        "key": "on-chain verification",
        "lift": -1.0,
        "action": "CRITICAL: Remove from pitch. Replace with 'programmable trust enforcement'"
      },
      {
        "dimension": "solutionTags",
        "key": "tokenized rewards",
        "lift": -1.0,
        "action": "Do not add reward token. Already correct — Truva has none."
      },
      {
        "dimension": "problemTags",
        "key": "high platform fees",
        "lift": -1.0,
        "action": "Do not lead with fee reduction messaging."
      }
    ]
  },

  "crowdedness": {
    "primary_cluster": "v1-c14 — Solana AI Agent Infrastructure",
    "cluster_projects": 325,
    "cluster_winners": 14,
    "cluster_win_rate": "4.3%",
    "niche_tag": "on-chain reputation",
    "niche_tag_count": 24,
    "assessment": "LOW niche crowdedness within HIGH cluster crowdedness. Blue ocean WITHIN the hottest category.",
    "direct_competitors_found": 0,
    "confirmed_blue_ocean": true
  },

  "research_sources": [
    {
      "title": "Return of the L1 wars: It's all about AI Agents",
      "author": "Vivekdeep Gupta",
      "source": "superteam_blog",
      "url": "https://blog.superteam.fun/p/layer-1-wars-its-about-ai-agents",
      "published_at": "2025-09-25",
      "relevance": "Confirms programmatic KYC thresholds for AI agent payments — core Truva thesis"
    },
    {
      "title": "Introducing Solana Attestation Service",
      "author": "Solana Foundation",
      "source": "solana_news",
      "url": "https://solana.com/news/solana-attestation-service",
      "published_at": "2025-05-23",
      "relevance": "Solana Foundation attestation infra aligns with Truva's attestation scoring signal"
    },
    {
      "title": "Solana Ecosystem Report H1 2025",
      "author": "Helius",
      "source": "helius_blog",
      "url": "https://www.helius.dev/blog/solana-ecosystem-report-h1-2025",
      "published_at": "2025-07-01",
      "relevance": "AI agent frameworks are the dominant Solana narrative entering Frontier"
    }
  ],

  "recommended_differentiation": [
    "CPI composability — single instruction gates any Solana protocol. ZERO competitors offer this.",
    "On-chain PDA Passport (not NFT mint) — permanent, authority-gated, composable.",
    "6-signal behavioral scoring → deterministic on-chain tier. No competitor does behavioral scoring.",
    "AgentWallet SDK integrates with elizaOS/LangChain — matches winner NLP overindex pattern.",
    "Frame as capital efficiency primitive, not reputation system."
  ],

  "recommended_tagline": "The programmable trust primitive for AI agents on Solana.",
  "avoid_messaging": ["on-chain verification", "reputation system", "lower fees", "NFT passport"]
}
```
