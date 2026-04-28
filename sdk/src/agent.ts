/**
 * AI Agent utilities for the Truva Protocol SDK.
 *
 * AgentWallet  — headless keypair wallet for autonomous agents (elizaOS, LangChain, etc.)
 * wrapWithTrustGate — middleware that gates any async function behind a trust-tier check
 */

import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import { TruvaClient } from "./client";
import type { TrustTier, TruvaClientConfig } from "./types";

// ── AgentWallet ───────────────────────────────────────────────────────────────

/**
 * Headless wallet backed by an in-memory `Keypair`.
 * Suitable for server-side AI agents that sign transactions autonomously.
 *
 * **Security:** Never store the raw `secretKey` in logs or environment variables
 * in production. Use a secrets manager (e.g. AWS Secrets Manager, Vault).
 *
 * @example
 * ```ts
 * const agentWallet = AgentWallet.generate();
 * const client = agentWallet.createClient(connection);
 * ```
 */
export class AgentWallet {
  readonly keypair: Keypair;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  /** Generate a fresh random keypair-backed agent wallet. */
  static generate(): AgentWallet {
    return new AgentWallet(Keypair.generate());
  }

  /**
   * Restore an agent wallet from a 64-byte secret-key array.
   * Useful for loading from an encrypted secrets store.
   */
  static fromSecretKey(secretKey: Uint8Array): AgentWallet {
    return new AgentWallet(Keypair.fromSecretKey(secretKey));
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  /** Satisfy the `TruvaClientConfig.wallet` interface. */
  get walletAdapter(): NonNullable<TruvaClientConfig["wallet"]> {
    return {
      publicKey: this.keypair.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(this.keypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach((tx) => tx.partialSign(this.keypair));
        return txs;
      },
    };
  }

  /**
   * Create a `TruvaClient` pre-configured with this agent wallet.
   */
  createClient(connection: Connection, config: Omit<TruvaClientConfig, "wallet"> = {}): TruvaClient {
    return new TruvaClient(connection, { ...config, wallet: this.walletAdapter });
  }
}

// ── wrapWithTrustGate ─────────────────────────────────────────────────────────

/**
 * Middleware pattern — wrap any async function with a Truva trust-gate check.
 * The wrapped function will throw `TruvaError` before executing if the agent
 * doesn't meet the required trust tier.
 *
 * @example
 * ```ts
 * const gatedTransfer = wrapWithTrustGate(client, agentPubkey, "Silver", transfer);
 * await gatedTransfer(recipient, amount); // gated
 * ```
 *
 * @param client - TruvaClient instance
 * @param agentPubkey - The agent being checked
 * @param requiredTier - Minimum trust tier required
 * @param fn - The async function to gate
 */
export function wrapWithTrustGate<TArgs extends unknown[], TReturn>(
  client: TruvaClient,
  agentPubkey: PublicKey,
  requiredTier: TrustTier,
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    await client.requireTrustTier(requiredTier, agentPubkey);
    return fn(...args);
  };
}
