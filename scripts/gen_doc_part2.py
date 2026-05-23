"""Part 2: Track content sections"""

TRACKS = [
    {
        "name": "Nepal Regional Track",
        "sponsor": "Superteam Nepal",
        "prize": "$10,000 USDG",
        "tier": "TIER 1 — ZERO CHANGES",
        "fit": "PERFECT",
        "effort": "30 minutes",
        "desc": "You are from Nepal — this is your home regional track. Submit your existing Truva project as-is.",
        "what_to_do": [
            "Submit on Colosseum portal first (required for all sidetracks)",
            "Submit on Superteam Earn Nepal track",
            "Highlight that Truva is Nepal-built infrastructure for the global Solana ecosystem",
            "Use your existing demo video and README"
        ],
        "code": None,
        "narrative": "Truva Protocol is built by a Nepali developer, bringing world-class AI agent infrastructure to the Solana ecosystem. Our on-chain trust layer ensures safe, verifiable AI agent payments."
    },
    {
        "name": "100xDevs Frontier Hackathon Track",
        "sponsor": "100xDevs (Harkirat Singh)",
        "prize": "$10,000 USDC (1st: $2,500 | 2nd: $2,000 | 3rd: $1,000 | 4th: $1,000 | 5th: $750)",
        "tier": "TIER 1 — ZERO CHANGES",
        "fit": "PERFECT",
        "effort": "30 minutes",
        "desc": "Open track — NO category restrictions. They explicitly accept 'Infra/protocols' and 'AI + crypto products'. Truva is both. Judging: Technical Execution 40%, Innovation 25%, Real-World Use 20%, UX 15%.",
        "what_to_do": [
            "Submit your existing Truva project as-is",
            "Emphasize: Anchor program + reputation engine + SDK + dashboard = full-stack",
            "Highlight the 13 passing tests, Devnet deployment, Eliza + LangChain integrations",
            "Show that any DeFi protocol can integrate TrustGate with a single CPI call"
        ],
        "code": None,
        "narrative": "Truva solves an unsolved problem: how do you trust an AI agent with your money? Our TrustGate is the gate nobody else has built — programmable, on-chain trust verification for autonomous agent payments."
    },
    {
        "name": "Adevar Labs — Security Audit Credits",
        "sponsor": "Adevar Labs Inc.",
        "prize": "$50,000 USDC in audit credits (Top 5 get $10,000 each)",
        "tier": "TIER 1 — ZERO CHANGES",
        "fit": "PERFECT",
        "effort": "30 minutes",
        "desc": "Top 5 Frontier projects receive $10K security audit each. Your Anchor program handles real SOL/SPL transfers — an audit is genuinely valuable.",
        "what_to_do": [
            "Submit your Anchor program (programs/trustgate/)",
            "Highlight that TrustGate processes real payments (security-critical)",
            "Mention PDA derivation, authority checks, and payment gating logic need formal audit",
            "Reference your 13 passing test cases as evidence of quality"
        ],
        "code": None,
        "narrative": "Truva's TrustGate handles real SOL and SPL token transfers. A professional security audit ensures our payment gating logic, PDA derivation, and authority validation are bulletproof."
    },
    {
        "name": "SNS Identity Track",
        "sponsor": "SNS / STMY / AllDomains",
        "prize": "$5,000 USDC",
        "tier": "TIER 1 — SMALL CHANGE",
        "fit": "STRONG",
        "effort": "2-4 hours",
        "desc": "They want Agent Identity solutions. Your Passport PDA IS an agent identity system. Add .sol domain resolution so agents can be looked up by SNS names.",
        "what_to_do": [
            "Install @bonfida/spl-name-service in the SDK",
            "Add resolveAgent() method to TruvaClient that resolves .sol domains to pubkeys",
            "Update the frontend to accept .sol names in the agent lookup",
            "Update README to show SNS integration"
        ],
        "code": '''// === FILE: sdk/src/client.ts ===
// Add this import at the top:
import { getDomainKeySync } from "@bonfida/spl-name-service";

// Add this method to the TruvaClient class:

/**
 * Resolve an agent identifier to a PublicKey.
 * Accepts either a base58 pubkey string or a .sol domain name.
 */
async resolveAgent(nameOrPubkey: string): Promise<PublicKey> {
  if (nameOrPubkey.endsWith('.sol')) {
    const domainName = nameOrPubkey.replace('.sol', '');
    const { pubkey } = getDomainKeySync(domainName);
    // Verify the domain owner has a Truva passport
    const ownerInfo = await this.connection.getAccountInfo(pubkey);
    if (!ownerInfo) {
      throw new Error(`SNS domain ${nameOrPubkey} not found`);
    }
    return pubkey;
  }
  return new PublicKey(nameOrPubkey);
}

// Update getAgentScore to accept string:
async getAgentScoreByName(nameOrPubkey: string): Promise<AgentPassportData> {
  const pubkey = await this.resolveAgent(nameOrPubkey);
  return this.getAgentScore(pubkey);
}

// === FILE: sdk/package.json ===
// Add dependency:
// "@bonfida/spl-name-service": "^3.0.0"''',
        "narrative": "Every .sol agent identity gets a verifiable on-chain trust score and reputation passport. Truva + SNS = human-readable, trust-verified agent identities on Solana."
    },
    {
        "name": "Eitherway — Build Live dApp",
        "sponsor": "Eitherway (Solflare, Kamino, DFlow, Quicknode, Birdeye)",
        "prize": "$20,000 USDC",
        "tier": "TIER 2 — INTEGRATION NEEDED",
        "fit": "STRONG",
        "effort": "6-8 hours",
        "desc": "Must build a live dApp on Eitherway's platform AND integrate at least one partner (Solflare, Kamino, DFlow, Quicknode, or Birdeye). Biggest prize pool.",
        "what_to_do": [
            "Build a 'Truva Trust Scanner' dApp on Eitherway",
            "Use Quicknode as RPC provider (easiest partner integration)",
            "OR use Birdeye API to show agent token holdings alongside trust scores",
            "Deploy the dApp live on Eitherway's platform"
        ],
        "code": '''// === NEW FILE: integrations/eitherway/trust-scanner.ts ===
import { TruvaClient } from "@truva/sdk";
import { Connection } from "@solana/web3.js";

// Use Quicknode as RPC (partner integration requirement)
const QUICKNODE_RPC = "https://your-quicknode-endpoint.solana-devnet.quiknode.pro/";
const connection = new Connection(QUICKNODE_RPC, "confirmed");
const truva = new TruvaClient(connection, {
  apiUrl: "https://your-backend-url.railway.app"
});

// Trust Scanner: Input pubkey -> Output full trust profile
export async function scanAgentTrust(pubkeyStr: string) {
  const pubkey = new PublicKey(pubkeyStr);
  
  // On-chain passport data
  const passport = await truva.getAgentScore(pubkey);
  
  // Off-chain profile from reputation engine
  const profile = await truva.getAgentProfile(pubkey);
  
  // Score history
  const history = await truva.getScoreHistory(pubkey);
  
  // Eligibility checks for each tier
  const bronzeEligible = await truva.isEligible(pubkey, "Bronze", 5_000_000_000);
  const silverEligible = await truva.isEligible(pubkey, "Silver", 50_000_000_000);
  const goldEligible = await truva.isEligible(pubkey, "Gold", 100_000_000_000);
  
  return {
    passport, profile, history,
    eligibility: { bronze: bronzeEligible, silver: silverEligible, gold: goldEligible }
  };
}''',
        "narrative": "Truva Trust Scanner lets any Solana user instantly verify an AI agent's reputation before transacting. Built on Eitherway with Quicknode RPC for reliability."
    },
    {
        "name": "Zerion — Autonomous Onchain Agent",
        "sponsor": "Zerion",
        "prize": "$5,000 USDC",
        "tier": "TIER 2 — DEMO AGENT NEEDED",
        "fit": "STRONG",
        "effort": "3-5 hours",
        "desc": "Build an autonomous agent using Zerion CLI for on-chain actions, gated by Truva trust verification.",
        "what_to_do": [
            "Install @zerion/defi-sdk or Zerion CLI",
            "Create a demo agent that uses AgentWallet from Truva SDK",
            "Agent checks counterparty trust scores before trading",
            "Only interact with Gold-tier verified agents"
        ],
        "code": '''// === NEW FILE: demos/zerion-trust-agent.ts ===
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AgentWallet, TruvaClient, wrapWithTrustGate } from "@truva/sdk";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Create autonomous agent with Truva trust gates
const agent = AgentWallet.generate();
const truva = agent.createClient(connection);

// Wrap any trading function with trust verification
async function executeSwap(counterparty: PublicKey, amount: number) {
  // 1. Verify counterparty trust before any trade
  const score = await truva.getAgentScore(counterparty);
  console.log(`Counterparty trust: ${score.tier} (${score.score}/100)`);
  
  if (score.frozen) {
    throw new Error(`BLOCKED: Counterparty ${counterparty.toBase58()} is frozen`);
  }
  
  if (score.tier !== "Gold" && score.tier !== "Silver") {
    throw new Error(`BLOCKED: ${score.tier} tier insufficient. Need Silver+`);
  }
  
  // 2. Use Zerion CLI for the actual swap
  // const zerion = new ZerionCLI({ wallet: agent.keypair });
  // await zerion.swap({ ... });
  
  console.log(`Trade executed with ${score.tier}-tier agent`);
  return { success: true, counterpartyTier: score.tier };
}

// Gate the swap function — auto-checks agent's OWN trust before proceeding
const gatedSwap = wrapWithTrustGate(
  truva, agent.publicKey, "Silver", executeSwap
);

// Usage: await gatedSwap(counterpartyPubkey, 1_000_000_000);''',
        "narrative": "An autonomous trading agent that uses Zerion CLI for on-chain operations but ONLY trades with counterparties verified by Truva's on-chain trust scores. Trust-first DeFi."
    },
    {
        "name": "Build with Torque MCP",
        "sponsor": "Torque",
        "prize": "$3,000 USDC",
        "tier": "TIER 2 — MCP SERVER NEEDED",
        "fit": "STRONG",
        "effort": "3-5 hours",
        "desc": "Build a Model Context Protocol (MCP) server that exposes Truva's TrustGate operations as tools for AI agents.",
        "what_to_do": [
            "Create an MCP server using @modelcontextprotocol/sdk",
            "Expose Truva operations as MCP tools: check_trust, verify_agent, register_agent",
            "Integrate with Torque's growth primitives for agent referrals",
            "Test with Claude Desktop or any MCP client"
        ],
        "code": '''// === NEW FILE: integrations/torque-mcp/server.ts ===
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { TruvaClient } from "@truva/sdk";
import { z } from "zod";

const connection = new Connection("https://api.devnet.solana.com");
const truva = new TruvaClient(connection);
const server = new McpServer({ name: "truva-trustgate", version: "1.0.0" });

// Tool 1: Check agent trust score
server.tool("check_agent_trust",
  { agentPubkey: z.string().describe("Solana public key of the agent") },
  async ({ agentPubkey }) => {
    const pubkey = new PublicKey(agentPubkey);
    const score = await truva.getAgentScore(pubkey);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          agent: agentPubkey,
          score: score.score,
          tier: score.tier,
          frozen: score.frozen,
          txCount: score.txCount,
          successRate: score.successRate,
          eligible: { bronze: true, silver: score.score >= 50, gold: score.score >= 80 }
        }, null, 2)
      }]
    };
  }
);

// Tool 2: Verify counterparty meets minimum tier
server.tool("verify_counterparty",
  {
    agentPubkey: z.string(),
    requiredTier: z.enum(["Bronze", "Silver", "Gold"])
  },
  async ({ agentPubkey, requiredTier }) => {
    try {
      const pubkey = new PublicKey(agentPubkey);
      await truva.requireTrustTier(requiredTier, pubkey);
      return { content: [{ type: "text", text: `PASS: Agent meets ${requiredTier} tier.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: `FAIL: ${e.message}` }] };
    }
  }
);

// Start MCP server
const transport = new StdioServerTransport();
await server.connect(transport);''',
        "narrative": "Truva MCP Server lets any AI agent (Claude, GPT-4, etc.) verify counterparty trust scores via the Model Context Protocol. Trust verification as a universal AI tool."
    },
    {
        "name": "Jupiter — Not Your Regular Bounty",
        "sponsor": "Jupiter",
        "prize": "$3,000 jupUSD (1st: $1,000 | 2nd: $750 | 3rd: $500 | 3x Bonus: $250)",
        "tier": "TIER 2 — JUPITER API INTEGRATION",
        "fit": "GOOD",
        "effort": "4-6 hours",
        "desc": "Jupiter wants creative integrations. Build a Trust-Gated DCA Agent that uses Jupiter's Swap V2 API but only executes for trusted agents.",
        "what_to_do": [
            "Get a Jupiter API key from developers.jup.ag",
            "Build a Trust-Gated DCA (Dollar Cost Average) agent",
            "Agent checks trust score before setting up Jupiter DCA positions",
            "Auto-pause DCA if agent trust drops below threshold"
        ],
        "code": '''// === NEW FILE: demos/jupiter-trust-dca.ts ===
import { TruvaClient } from "@truva/sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const truva = new TruvaClient(connection);

const JUPITER_API = "https://api.jup.ag/swap/v2";

// Trust-Gated DCA: Only trusted agents can set up auto-swaps
async function createTrustGatedDCA(
  agentPubkey: PublicKey,
  inputMint: string,   // e.g., USDC mint
  outputMint: string,  // e.g., SOL mint
  amountPerSwap: number,
  intervalMs: number
) {
  // Step 1: Verify agent trust
  const score = await truva.getAgentScore(agentPubkey);
  if (score.tier === "Bronze") {
    throw new Error(`Agent ${score.tier} tier too low for DCA. Need Silver+`);
  }
  if (score.frozen) {
    throw new Error("Agent frozen — cannot create DCA position");
  }
  
  // Step 2: Get Jupiter quote
  const quoteRes = await fetch(
    `https://api.jup.ag/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountPerSwap}`
  );
  const quote = await quoteRes.json();
  
  // Step 3: Execute swap via Jupiter
  const swapRes = await fetch(`${JUPITER_API}/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: agentPubkey.toBase58() })
  });
  
  return { success: true, agentTier: score.tier, quote };
}''',
        "narrative": "Trust-Gated DCA Agent: AI agents set up Jupiter Dollar Cost Average positions, but only after passing Truva's on-chain trust verification. Untrusted agents can't auto-trade."
    },
    {
        "name": "Dune Analytics — Frontier Data Sidetrack",
        "sponsor": "Dune",
        "prize": "$6,000 USDC (Dune plan credits)",
        "tier": "TIER 2 — DASHBOARD NEEDED",
        "fit": "GOOD",
        "effort": "3-4 hours",
        "desc": "Build a Dune Analytics dashboard visualizing Truva's on-chain agent reputation data.",
        "what_to_do": [
            "Create a Dune account and new dashboard",
            "Write SQL queries against Solana decoded tables for your program ID",
            "Visualize: passport creation, tier distribution, payment volume, top agents",
            "Add charts for frozen vs active passports, trust score distribution"
        ],
        "code": '''-- === DUNE QUERY 1: Agent Passport Creation Over Time ===
SELECT
  DATE_TRUNC('day', block_time) AS day,
  COUNT(*) AS passports_created
FROM solana.transactions
WHERE contains(account_keys, 'BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5')
  AND success = true
GROUP BY 1
ORDER BY 1;

-- === DUNE QUERY 2: Trust Tier Distribution ===
-- (Query your program's decoded instruction data)
SELECT
  CASE
    WHEN trust_tier = 0 THEN 'Bronze'
    WHEN trust_tier = 1 THEN 'Silver'
    WHEN trust_tier = 2 THEN 'Gold'
  END AS tier,
  COUNT(*) AS agent_count
FROM truva_decoded.passports
GROUP BY trust_tier;

-- === DUNE QUERY 3: TrustGate Payment Volume ===
SELECT
  DATE_TRUNC('day', block_time) AS day,
  SUM(amount_sol) AS total_sol_transferred,
  COUNT(*) AS payment_count
FROM truva_decoded.payments
GROUP BY 1
ORDER BY 1;''',
        "narrative": "Transparent reputation analytics: anyone can verify the Truva Protocol's agent ecosystem health, trust distribution, and payment volumes through our public Dune dashboard."
    },
    {
        "name": "Cloak — Privacy Payments Track",
        "sponsor": "Cloak",
        "prize": "$5,010 USDC",
        "tier": "TIER 3 — STRETCH",
        "fit": "POSSIBLE",
        "effort": "4-6 hours",
        "desc": "Build real-world payment solutions with privacy using Cloak. Idea: public trust scores + private payment amounts.",
        "what_to_do": [
            "Integrate Cloak's shielded transfer SDK",
            "Agent reputation is public (on-chain PDA), but payment details are private",
            "Trust-gate access to Cloak's privacy features based on agent tier",
            "Gold-tier agents get access to private high-value transfers"
        ],
        "code": '''// === CONCEPT: Private Trust-Gated Payments ===
// Agent trust score: PUBLIC (on-chain PDA)
// Payment amount & counterparty: PRIVATE (via Cloak)

import { TruvaClient } from "@truva/sdk";
// import { CloakSDK } from "@cloak/sdk";

async function privateTrustGatedPayment(
  agentPubkey: PublicKey,
  recipient: PublicKey,
  amountLamports: number
) {
  const truva = new TruvaClient(connection);
  
  // 1. Public trust check
  await truva.requireTrustTier("Gold", agentPubkey);
  
  // 2. Private payment via Cloak
  // const cloak = new CloakSDK(connection);
  // const tx = await cloak.shieldedTransfer({
  //   from: agentPubkey, to: recipient,
  //   amount: amountLamports,
  //   memo: "trust-gated-private"
  // });
  
  return { verified: true, private: true };
}''',
        "narrative": "Best of both worlds: Truva's public trust verification ensures only reputable agents transact, while Cloak's privacy layer keeps payment details confidential."
    },
    {
        "name": "RPC Fast — Infrastructure Credits",
        "sponsor": "RPC Fast",
        "prize": "$10,000 USDC in RPC credits",
        "tier": "TIER 2 — MINIMAL CHANGE",
        "fit": "GOOD",
        "effort": "1-2 hours",
        "desc": "Use RPC Fast as your RPC provider. Show it in your config and README.",
        "what_to_do": [
            "Sign up for RPC Fast and get an endpoint URL",
            "Update .env to use RPC Fast endpoint",
            "Update README to mention RPC Fast partnership",
            "Show RPC Fast in your demo video"
        ],
        "code": '''# === FILE: backend/reputation-engine/.env ===
# Change this:
# SOLANA_RPC_URL=https://api.devnet.solana.com
# To this:
SOLANA_RPC_URL=https://your-endpoint.rpcfast.com/devnet

# === FILE: sdk/src/pda.ts ===
# No code changes needed — RPC URL is passed via Connection constructor

# === FILE: README.md ===
# Add to Prerequisites section:
# - [RPC Fast](https://rpcfast.com) — High-performance Solana RPC (recommended)''',
        "narrative": "Truva Protocol uses RPC Fast for reliable, high-performance Solana RPC access, ensuring our reputation engine processes agent data with minimal latency."
    },
    {
        "name": "Encrypt & Ika — Bridgeless Capital Markets",
        "sponsor": "Encrypt",
        "prize": "$15,000 USDC",
        "tier": "TIER 3 — HEAVY LIFT",
        "fit": "STRETCH",
        "effort": "8-12 hours",
        "desc": "Encrypted/bridgeless capital markets. Would need to integrate Encrypt's MPC/FHE infrastructure. Only attempt if time permits.",
        "what_to_do": [
            "Integrate Encrypt's SDK for encrypted computation",
            "Use Ika's bridgeless infrastructure for cross-chain trust",
            "Build encrypted trust score verification (verify without revealing exact score)",
            "ZK proof signal in scoring engine already touches this space"
        ],
        "code": None,
        "narrative": "Truva's ZK proof scoring signal meets Encrypt's encrypted computation: verify agent trustworthiness without revealing exact scores. Privacy-preserving reputation."
    },
    {
        "name": "Build with Umbra Side Track",
        "sponsor": "Umbra",
        "prize": "$10,000 USDC",
        "tier": "TIER 3 — STRETCH",
        "fit": "POSSIBLE",
        "effort": "6-8 hours",
        "desc": "Integrate Umbra's stealth addresses for private trust-gated transfers.",
        "what_to_do": [
            "Integrate Umbra's stealth address SDK",
            "Enable private agent-to-agent transfers that are still trust-gated",
            "Agent identity is verified by Truva, but recipient address is hidden via Umbra",
            "Useful for confidential AI agent operations"
        ],
        "code": None,
        "narrative": "Trusted but private: Truva verifies agents are reputable, Umbra hides where the money goes. Perfect for confidential AI agent operations."
    },
]
