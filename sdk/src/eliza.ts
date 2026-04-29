/**
 * Truva elizaOS Plugin
 *
 * Enforces on-chain trust tiers for AI agents via the Truva Protocol.
 *
 * @example
 * ```ts
 * import { truvaPlugin } from "@truva/sdk/eliza";
 *
 * const runtime = new AgentRuntime({ plugins: [truvaPlugin] });
 * ```
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { TruvaClient } from "./client";
import { TruvaError, InsufficientTierError, AgentFrozenError } from "./errors";
import type { TrustTier } from "./types";

// ── Minimal elizaOS interface stubs ───────────────────────────────────────────
// Defined inline — no hard dependency on @elizaos/core at runtime.

interface IAgentRuntime {
  agentId: string;
  getSetting: (key: string) => string | undefined;
}

interface Memory {
  content: {
    text?: string;
    amount?: number;
    tier?: string;
    agentId?: string;
    [key: string]: unknown;
  };
}

interface ActionResult {
  success: boolean;
  data: unknown;
  metadata: { toolName: string };
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export const truvaPlugin = {
  name: "truva-reputation",
  description:
    "Enforces on-chain trust tiers for AI agents via Truva Protocol",

  actions: [
    {
      name: "TRUVA_VERIFY_TRUST",
      description:
        "Verifies an agent meets a required trust tier before authorizing " +
        "any financial operation on Solana",

      /**
       * Activate when:
       * - Message specifies a tier requirement, OR
       * - Amount exceeds Bronze ceiling (5 SOL in lamports)
       */
      validate: async (
        _runtime: IAgentRuntime,
        message: Memory
      ): Promise<boolean> => {
        const amount = (message.content.amount as number | undefined) ?? 0;
        const hasTier = !!message.content.tier;
        return hasTier || amount > 5_000_000_000;
      },

      handler: async (
        runtime: IAgentRuntime,
        message: Memory
      ): Promise<ActionResult> => {
        const agentId =
          (message.content.agentId as string | undefined) ?? runtime.agentId;
        const tier = ((message.content.tier as string | undefined) ??
          "Silver") as TrustTier;
        const amount = message.content.amount as number | undefined;

        const rpcUrl =
          runtime.getSetting("SOLANA_RPC_URL") ??
          "https://api.devnet.solana.com";

        const connection = new Connection(rpcUrl, "confirmed");
        const truva = new TruvaClient(connection);

        try {
          let agentPubkey: PublicKey;
          try {
            agentPubkey = new PublicKey(agentId);
          } catch {
            return {
              success: false,
              data: {
                agentId,
                verified: false,
                code: "INVALID_PUBKEY",
                message: `Invalid Solana public key: ${agentId}`,
                suggestion:
                  "Check the agent public key format at truva-x.tech.",
              },
              metadata: { toolName: "TRUVA_VERIFY_TRUST" },
            };
          }

          await truva.requireTrustTier(tier, agentPubkey);

          // Optional: check amount against tier ceiling
          if (amount !== undefined) {
            const eligible = await truva.isEligible(agentPubkey, tier, amount);
            if (!eligible) {
              return {
                success: false,
                data: {
                  agentId,
                  verified: false,
                  code: "EXCEEDS_TIER_LIMIT",
                  message: `Amount ${amount} lamports exceeds ${tier} tier limit`,
                  suggestion: `Reduce amount or upgrade agent to a higher tier.`,
                },
                metadata: { toolName: "TRUVA_VERIFY_TRUST" },
              };
            }
          }

          return {
            success: true,
            data: {
              agentId,
              tier,
              verified: true,
              message: `Agent verified at ${tier} tier. Operation authorized.`,
            },
            metadata: { toolName: "TRUVA_VERIFY_TRUST" },
          };
        } catch (error) {
          const e = error as TruvaError;
          const suggestion =
            error instanceof AgentFrozenError
              ? "This agent has been frozen by a validator. Contact truva-x.tech."
              : error instanceof InsufficientTierError
              ? `Agent needs ${(error as InsufficientTierError).requiredTier} tier. ` +
                `Current tier is ${(error as InsufficientTierError).actualTier}. ` +
                `Complete more successful transactions to upgrade.`
              : "Trust verification failed. Check agent registration at truva-x.tech.";

          return {
            success: false,
            data: {
              agentId,
              verified: false,
              code: e.code ?? "TRUST_CHECK_FAILED",
              message: e.message,
              suggestion,
            },
            metadata: { toolName: "TRUVA_VERIFY_TRUST" },
          };
        }
      },

      examples: [
        [
          {
            user: "agent",
            content: {
              text: "Execute $50,000 swap on Jupiter",
              amount: 50_000_000_000,
              tier: "Silver",
              agentId: "AGENT_PUBKEY_HERE",
            },
          },
          {
            user: "truva",
            content: {
              text: "Agent verified at Silver tier. Operation authorized.",
            },
          },
        ],
      ],
    },
  ],

  providers: [
    {
      name: "TRUVA_TRUST_STATUS",
      description:
        "Provides current trust score and tier for agent context window",

      get: async (
        runtime: IAgentRuntime,
        _message: Memory
      ): Promise<string> => {
        const rpcUrl =
          runtime.getSetting("SOLANA_RPC_URL") ??
          "https://api.devnet.solana.com";

        try {
          const connection = new Connection(rpcUrl, "confirmed");
          const truva = new TruvaClient(connection);

          let agentPubkey: PublicKey;
          try {
            agentPubkey = new PublicKey(runtime.agentId);
          } catch {
            return JSON.stringify({
              agentId: runtime.agentId,
              error: "Invalid agent public key format",
            });
          }

          const profile = await truva.getAgentProfile(agentPubkey);
          return JSON.stringify({
            agentId: runtime.agentId,
            score: profile?.score ?? 0,
            tier: profile?.tier ?? "Bronze",
            txCount: profile?.txCount ?? 0,
            frozen: profile?.frozen ?? false,
            source: "Truva Protocol",
          });
        } catch {
          return JSON.stringify({
            agentId: runtime.agentId,
            error: "Could not fetch trust status from Truva",
          });
        }
      },
    },
  ],
};

