/**
 * Truva TrustGate MCP Server
 *
 * Exposes Truva Protocol's trust verification operations as
 * Model Context Protocol (MCP) tools for AI agents.
 *
 * Compatible with Claude Desktop, GPT-4, and any MCP client.
 *
 * Usage:
 *   npx ts-node integrations/torque-mcp/server.ts
 *
 * @see https://modelcontextprotocol.io
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { z } from "zod";

// ── Config ──────────────────────────────────────────────────────────────────

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ||
  "https://solana-rpc.rpcfast.com/3iA4Q8dhKFv1wNYgfqaEhTpfVrjV1tttBUyVSZGGkayWHeJpGXTL6ZDNjwDaDqhg";

const TRUVA_API_URL = process.env.TRUVA_API_URL || "http://localhost:3001";

const PROGRAM_ID =
  process.env.TRUVA_PROGRAM_ID || "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5";

const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// ── PDA Derivation ──────────────────────────────────────────────────────────

function derivePassportPDA(agentPubkey: string): [PublicKey, number] {
  const agentKey = new PublicKey(agentPubkey);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentKey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

// ── Passport Parser ─────────────────────────────────────────────────────────

const TIER_MAP: Record<number, string> = { 0: "Bronze", 1: "Silver", 2: "Gold" };

function parsePassport(data: Buffer) {
  let offset = 8; // skip Anchor discriminator
  offset += 32; // agent pubkey
  offset += 32; // authority pubkey

  const trustScore = data[offset]; offset += 1;
  const tierByte = data[offset]; offset += 1;

  const txCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const successCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const frozen = data[offset] === 1;

  const tier = TIER_MAP[tierByte] ?? "Bronze";
  const successRate = txCount > 0
    ? Math.round((successCount / txCount) * 1000) / 1000
    : 0;

  return { score: trustScore, tier, txCount, successCount, successRate, frozen };
}

// ── MCP Server Setup ────────────────────────────────────────────────────────

const server = new McpServer({
  name: "truva-trustgate",
  version: "1.0.0",
});

// Tool 1: Check agent trust score
server.tool(
  "check_agent_trust",
  "Check the on-chain trust score, tier, and transaction stats for a Solana AI agent",
  { agentPubkey: z.string().describe("Solana public key (base58) of the agent") },
  async ({ agentPubkey }) => {
    try {
      const [pda] = derivePassportPDA(agentPubkey);
      const accountInfo = await connection.getAccountInfo(pda);

      if (!accountInfo) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { error: `No Truva passport found for agent ${agentPubkey}` },
                null,
                2
              ),
            },
          ],
        };
      }

      const passport = parsePassport(accountInfo.data);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                agent: agentPubkey,
                score: passport.score,
                tier: passport.tier,
                frozen: passport.frozen,
                txCount: passport.txCount,
                successRate: passport.successRate,
                eligible: {
                  bronze: true,
                  silver: passport.score >= 50,
                  gold: passport.score >= 80,
                },
                passportPDA: pda.toBase58(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${e.message}` }],
      };
    }
  }
);

// Tool 2: Verify counterparty meets minimum tier
server.tool(
  "verify_counterparty",
  "Verify that an AI agent meets a minimum trust tier requirement before transacting",
  {
    agentPubkey: z.string().describe("Solana public key of the agent to verify"),
    requiredTier: z
      .enum(["Bronze", "Silver", "Gold"])
      .describe("Minimum trust tier required"),
  },
  async ({ agentPubkey, requiredTier }) => {
    try {
      const [pda] = derivePassportPDA(agentPubkey);
      const accountInfo = await connection.getAccountInfo(pda);

      if (!accountInfo) {
        return {
          content: [
            { type: "text" as const, text: `FAIL: No passport found for ${agentPubkey}` },
          ],
        };
      }

      const passport = parsePassport(accountInfo.data);

      if (passport.frozen) {
        return {
          content: [
            { type: "text" as const, text: `FAIL: Agent ${agentPubkey} is FROZEN. All transactions blocked.` },
          ],
        };
      }

      const tierRank: Record<string, number> = { Bronze: 0, Silver: 1, Gold: 2 };
      const agentRank = tierRank[passport.tier] ?? 0;
      const requiredRank = tierRank[requiredTier] ?? 0;

      if (agentRank >= requiredRank) {
        return {
          content: [
            {
              type: "text" as const,
              text: `PASS: Agent is ${passport.tier} (score ${passport.score}/100). Meets ${requiredTier} requirement.`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `FAIL: Agent is ${passport.tier} (score ${passport.score}/100) but ${requiredTier} is required.`,
            },
          ],
        };
      }
    } catch (e: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${e.message}` }],
      };
    }
  }
);

// Tool 3: Get platform-wide stats
server.tool(
  "get_platform_stats",
  "Get aggregate statistics from the Truva Protocol reputation engine",
  {},
  async () => {
    try {
      const res = await fetch(`${TRUVA_API_URL}/api/stats`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching stats: ${e.message}. Is the reputation engine running at ${TRUVA_API_URL}?`,
          },
        ],
      };
    }
  }
);

// Tool 4: Check payment eligibility
server.tool(
  "check_payment_eligibility",
  "Check if an agent is eligible to make a payment of a specific amount based on their trust tier",
  {
    agentPubkey: z.string().describe("Solana public key of the agent"),
    amountSol: z.number().describe("Payment amount in SOL"),
  },
  async ({ agentPubkey, amountSol }) => {
    try {
      const [pda] = derivePassportPDA(agentPubkey);
      const accountInfo = await connection.getAccountInfo(pda);

      if (!accountInfo) {
        return {
          content: [
            { type: "text" as const, text: `INELIGIBLE: No passport found for ${agentPubkey}` },
          ],
        };
      }

      const passport = parsePassport(accountInfo.data);

      if (passport.frozen) {
        return {
          content: [
            { type: "text" as const, text: `INELIGIBLE: Agent is frozen.` },
          ],
        };
      }

      const tierLimits: Record<string, number> = {
        Bronze: 5,
        Silver: 100,
        Gold: Infinity,
      };
      const limit = tierLimits[passport.tier] ?? 0;

      if (amountSol <= limit) {
        return {
          content: [
            {
              type: "text" as const,
              text: `ELIGIBLE: ${passport.tier} tier agent can transfer up to ${limit === Infinity ? "unlimited" : limit + " SOL"}. Requested: ${amountSol} SOL.`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: `INELIGIBLE: ${passport.tier} tier limit is ${limit} SOL but ${amountSol} SOL was requested. Agent needs ${amountSol > 100 ? "Gold" : "Silver"} tier.`,
            },
          ],
        };
      }
    } catch (e: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${e.message}` }],
      };
    }
  }
);

// ── Start Server ────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🛡️  Truva TrustGate MCP Server running on stdio");
}

main().catch(console.error);
