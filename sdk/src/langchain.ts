/**
 * Truva LangChain Tool
 *
 * Creates a StructuredTool-compatible trust-gate tool for use with any
 * LangChain agent (GPT-4, Claude, Gemini, etc.).
 *
 * @example
 * ```ts
 * import { createTruvaTool } from "@truva/sdk/langchain";
 *
 * const tools = [createTruvaTool(connection)];
 * const agent = createReactAgent({ llm, tools });
 * ```
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { TruvaClient } from "./client";
import type { TrustTier } from "./types";

export interface TruvaToolInput {
  tier: string;
  agentPubkey: string;
  amount?: number;
}

export interface TruvaToolResult {
  status: "PASS" | "FAIL";
  tier?: string;
  message: string;
  code?: string;
  action?: string;
}

export interface LangChainToolLike {
  name: string;
  description: string;
  schema: object;
  invoke: (input: TruvaToolInput) => Promise<string>;
}

/**
 * Creates a Truva trust-check tool compatible with LangChain's
 * StructuredTool interface.
 *
 * Works with GPT-4, Claude, Gemini — any LLM that supports tool calling.
 *
 * @param connection - A `@solana/web3.js` Connection instance
 * @param apiUrl     - Optional reputation engine URL (default: http://localhost:3001)
 */
export function createTruvaTool(
  connection: Connection,
  apiUrl?: string
): LangChainToolLike {
  const truva = new TruvaClient(connection, { apiUrl });

  return {
    name: "truva_trust_check",

    description:
      "Verifies an AI agent meets a required trust tier on Solana before " +
      "authorizing a financial operation. " +
      "Returns PASS or FAIL with reason. " +
      "ALWAYS call this before executing transactions over 5 SOL.",

    schema: {
      type: "object",
      properties: {
        tier: {
          type: "string",
          enum: ["Bronze", "Silver", "Gold", "Platinum"],
          description: "Minimum trust tier required for this operation",
        },
        agentPubkey: {
          type: "string",
          description: "Solana public key of the agent to verify",
        },
        amount: {
          type: "number",
          description:
            "Optional: transaction amount in lamports to check against tier limit",
        },
      },
      required: ["tier", "agentPubkey"],
    },

    invoke: async ({ tier, agentPubkey, amount }): Promise<string> => {
      let pubkey: PublicKey;
      try {
        pubkey = new PublicKey(agentPubkey);
      } catch {
        return JSON.stringify({
          status: "FAIL",
          code: "INVALID_PUBKEY",
          message: `Invalid Solana public key: ${agentPubkey}`,
          action: "DO NOT execute this transaction.",
        } satisfies TruvaToolResult);
      }

      try {
        await truva.requireTrustTier(tier as TrustTier, pubkey);

        // Optional amount eligibility check
        if (amount !== undefined) {
          const eligible = await truva.isEligible(pubkey, tier as TrustTier, amount);
          if (!eligible) {
            return JSON.stringify({
              status: "FAIL",
              code: "EXCEEDS_TIER_LIMIT",
              message: `Amount ${amount} lamports exceeds the ${tier} tier limit.`,
              action: "DO NOT execute this transaction.",
            } satisfies TruvaToolResult);
          }
        }

        return JSON.stringify({
          status: "PASS",
          tier,
          message: `Agent verified. ${tier} tier confirmed. Proceed.`,
        } satisfies TruvaToolResult);
      } catch (error: unknown) {
        const e = error as { code?: string; message?: string };
        return JSON.stringify({
          status: "FAIL",
          code: e.code ?? "UNKNOWN_ERROR",
          message: e.message ?? "Trust check failed.",
          action: "DO NOT execute this transaction.",
        } satisfies TruvaToolResult);
      }
    },
  };
}
