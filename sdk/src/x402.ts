/**
 * x402-style paywall settled through a Truva agent vault.
 *
 * Flow (HTTP 402 handshake, same shape as x402):
 *   1. Agent requests a resource. Server answers 402 with payment requirements.
 *   2. Agent builds and signs a `vault_pay` transaction and retries with it in
 *      the `X-PAYMENT` header.
 *   3. Server checks the transaction pays it the right amount, submits it,
 *      waits for confirmation and serves the resource.
 *
 * The scheme is `truva-vault`, not x402's stock `exact` scheme: the funds sit
 * in a program-owned vault, so payment is a `vault_pay` instruction rather
 * than a plain token transfer, and the server settles it itself instead of
 * calling a third-party facilitator. The program enforces the vault owner's
 * limits, the agent's passport and the seller's merchant policy at settlement.
 */

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import type { Signer } from "@solana/web3.js";
import { TruvaClient } from "./client";
import { DISCRIMINATORS, PROGRAM_ERRORS, vaultPayIx } from "./instructions";
import { TRUSTGATE_PROGRAM_ID, deriveAssociatedTokenAddress } from "./pda";
import type { TrustTier } from "./types";
import { TIER_RANK } from "./types";

export const TRUVA_VAULT_SCHEME = "truva-vault";
const X402_VERSION = 1;

/** One entry of the `accepts` array in a 402 response. */
export interface PaymentRequirements {
  scheme: typeof TRUVA_VAULT_SCHEME;
  /** e.g. "solana-devnet", "solana" */
  network: string;
  /** Price in token base units, as a decimal string */
  maxAmountRequired: string;
  /** Token mint address */
  asset: string;
  /** Seller wallet (payment goes to its associated token account) */
  payTo: string;
  resource: string;
  description?: string;
  maxTimeoutSeconds: number;
  extra: {
    programId: string;
    /** Minimum trust tier the seller accepts */
    minTier: TrustTier;
  };
}

export interface SettledPayment {
  signature: string;
  /** The agent that paid */
  payer: string;
  amount: string;
  network: string;
}

/** Thrown when a payment is refused, by the server or by the buyer's own guard. */
export class PaymentRejectedError extends Error {
  constructor(public readonly reason: string) {
    super(`Payment rejected: ${reason}`);
    this.name = "PaymentRejectedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Seller side ──────────────────────────────────────────────────────────────

export function buildPaymentRequirements(opts: {
  payTo: PublicKey;
  mint: PublicKey;
  /** Price in token base units */
  amount: bigint | number;
  resource: string;
  network?: string;
  minTier?: TrustTier;
  description?: string;
  programId?: PublicKey;
}): PaymentRequirements {
  return {
    scheme: TRUVA_VAULT_SCHEME,
    network: opts.network ?? "solana-devnet",
    maxAmountRequired: BigInt(opts.amount).toString(),
    asset: opts.mint.toBase58(),
    payTo: opts.payTo.toBase58(),
    resource: opts.resource,
    description: opts.description,
    maxTimeoutSeconds: 60,
    extra: {
      programId: (opts.programId ?? TRUSTGATE_PROGRAM_ID).toBase58(),
      minTier: opts.minTier ?? "Bronze",
    },
  };
}

/** Turn a failed simulation or confirmation error into a program error name. */
function describeTxError(err: unknown): string {
  const custom = (err as any)?.InstructionError?.[1]?.Custom;
  if (typeof custom === "number") {
    return PROGRAM_ERRORS[custom] ?? `program error ${custom}`;
  }
  return typeof err === "string" ? err : JSON.stringify(err);
}

/**
 * Verify an `X-PAYMENT` header against the requirements, submit the
 * transaction and wait for confirmation.
 *
 * @throws PaymentRejectedError if the payment is malformed, pays the wrong
 *   recipient/amount, the agent is below the required tier, or the program
 *   refuses it (limits, pause, freeze, merchant policy).
 */
export async function settleVaultPayment(
  connection: Connection,
  paymentHeader: string,
  requirements: PaymentRequirements
): Promise<SettledPayment> {
  let tx: Transaction;
  try {
    const decoded = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf8"));
    if (decoded.scheme !== requirements.scheme || decoded.network !== requirements.network) {
      throw new PaymentRejectedError("scheme or network does not match");
    }
    tx = Transaction.from(Buffer.from(decoded.payload.transaction, "base64"));
  } catch (err) {
    if (err instanceof PaymentRejectedError) throw err;
    throw new PaymentRejectedError("malformed X-PAYMENT header");
  }

  const programId = new PublicKey(requirements.extra.programId);
  const mint = new PublicKey(requirements.asset);
  const payTo = new PublicKey(requirements.payTo);
  const price = BigInt(requirements.maxAmountRequired);

  // Exactly one TrustGate instruction; only compute-budget instructions beside it
  const others = tx.instructions.filter(
    (ix) => !ix.programId.equals(programId) && !ix.programId.equals(ComputeBudgetProgram.programId)
  );
  const payIxs = tx.instructions.filter((ix) => ix.programId.equals(programId));
  if (others.length > 0 || payIxs.length !== 1) {
    throw new PaymentRejectedError("transaction must contain exactly one vault_pay instruction");
  }

  const ix = payIxs[0];
  const isVaultPay =
    ix.data.length === 16 &&
    ix.keys.length === 9 &&
    ix.data.subarray(0, 8).equals(Buffer.from(DISCRIMINATORS.vault_pay));
  if (!isVaultPay) {
    throw new PaymentRejectedError("instruction is not vault_pay");
  }

  const amount = ix.data.readBigUInt64LE(8);
  if (amount < price) {
    throw new PaymentRejectedError(`amount ${amount} is below the price ${price}`);
  }
  // vault_pay accounts: [4] recipient token account, [6] mint, [7] agent
  if (!ix.keys[4].pubkey.equals(deriveAssociatedTokenAddress(mint, payTo))) {
    throw new PaymentRejectedError("payment is not addressed to this seller");
  }
  if (!ix.keys[6].pubkey.equals(mint)) {
    throw new PaymentRejectedError("payment is in the wrong token");
  }
  const agent = ix.keys[7].pubkey;

  // Seller's own tier requirement (independent of any on-chain merchant policy)
  const minTier = requirements.extra.minTier;
  let passport;
  try {
    passport = await new TruvaClient(connection).getAgentScore(agent);
  } catch {
    throw new PaymentRejectedError("agent has no Truva passport");
  }
  if (passport.trusted === false) throw new PaymentRejectedError("UntrustedAuthority");
  if (passport.frozen) throw new PaymentRejectedError("PassportFrozen");
  if (TIER_RANK[passport.tier] < TIER_RANK[minTier]) {
    throw new PaymentRejectedError(
      `InsufficientTrustTier: agent is ${passport.tier}, ${minTier} required`
    );
  }

  // Preflight simulation runs first, so a refused payment costs nobody a fee
  let signature: string;
  try {
    signature = await connection.sendRawTransaction(tx.serialize());
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    const custom = /custom program error: 0x([0-9a-f]+)/i.exec(message);
    throw new PaymentRejectedError(
      custom
        ? describeTxError({ InstructionError: [0, { Custom: parseInt(custom[1], 16) }] })
        : `submission failed: ${message}`
    );
  }
  const confirmation = await connection.confirmTransaction(signature, "confirmed");
  if (confirmation.value.err) {
    throw new PaymentRejectedError(describeTxError(confirmation.value.err));
  }

  return {
    signature,
    payer: agent.toBase58(),
    amount: amount.toString(),
    network: requirements.network,
  };
}

export interface PaywallOptions {
  connection: Connection;
  /** Seller wallet. Its associated token account for `mint` must exist. */
  payTo: PublicKey;
  mint: PublicKey;
  /** Price in token base units */
  amount: bigint | number;
  minTier?: TrustTier;
  network?: string;
  description?: string;
  programId?: PublicKey;
}

/**
 * Express-style middleware (also works with a bare Node `http` server) that
 * charges `amount` per request. On success the settled payment is attached as
 * `req.truvaPayment` and echoed in the `X-PAYMENT-RESPONSE` header.
 */
export function truvaPaywall(options: PaywallOptions) {
  return async (req: any, res: any, next: () => void): Promise<void> => {
    const requirements = buildPaymentRequirements({
      ...options,
      resource: req.originalUrl ?? req.url ?? "/",
    });

    const refuse = (error: string) => {
      res.statusCode = 402;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ x402Version: X402_VERSION, error, accepts: [requirements] }));
    };

    const header = req.headers?.["x-payment"];
    if (!header || typeof header !== "string") {
      refuse("X-PAYMENT header is required");
      return;
    }

    try {
      const settled = await settleVaultPayment(options.connection, header, requirements);
      req.truvaPayment = settled;
      res.setHeader(
        "X-PAYMENT-RESPONSE",
        Buffer.from(JSON.stringify({ success: true, ...settled })).toString("base64")
      );
      next();
    } catch (err) {
      if (err instanceof PaymentRejectedError) {
        refuse(err.reason);
        return;
      }
      throw err;
    }
  };
}

// ── Buyer side ───────────────────────────────────────────────────────────────

/**
 * Build and sign the `X-PAYMENT` header value for a `truva-vault` requirement.
 * The agent signs and pays the transaction fee; the tokens come from the vault.
 */
export async function createVaultPayment(opts: {
  connection: Connection;
  /** The agent's keypair */
  agent: Signer;
  /** Wallet that owns the vault the agent spends from */
  vaultOwner: PublicKey;
  requirements: PaymentRequirements;
}): Promise<string> {
  const { connection, agent, vaultOwner, requirements } = opts;

  const tx = new Transaction().add(
    vaultPayIx(
      vaultOwner,
      agent.publicKey,
      new PublicKey(requirements.asset),
      new PublicKey(requirements.payTo),
      BigInt(requirements.maxAmountRequired),
      new PublicKey(requirements.extra.programId)
    )
  );
  tx.feePayer = agent.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(agent);

  return Buffer.from(
    JSON.stringify({
      x402Version: X402_VERSION,
      scheme: requirements.scheme,
      network: requirements.network,
      payload: { transaction: tx.serialize().toString("base64") },
    })
  ).toString("base64");
}

export interface FetchWithVaultOptions {
  connection: Connection;
  agent: Signer;
  vaultOwner: PublicKey;
  /** Refuse to pay more than this (token base units), whatever the server asks */
  maxAmount?: bigint | number;
  /** Refuse to pay in any other token */
  mint?: PublicKey;
  fetch?: typeof fetch;
}

/**
 * `fetch` that pays a `truva-vault` 402 challenge from the agent's vault and
 * retries once.
 *
 * @throws PaymentRejectedError if the price is above `maxAmount`, the token is
 *   not `mint`, or the server refuses the payment.
 */
export async function fetchWithVault(
  url: string,
  init: RequestInit | undefined,
  opts: FetchWithVaultOptions
): Promise<Response> {
  const doFetch = opts.fetch ?? fetch;

  const first = await doFetch(url, init);
  if (first.status !== 402) return first;

  const challenge = (await first.json()) as { accepts?: PaymentRequirements[] };
  const requirements = challenge.accepts?.find((a) => a.scheme === TRUVA_VAULT_SCHEME);
  if (!requirements) {
    throw new PaymentRejectedError("server does not accept truva-vault payments");
  }
  if (opts.mint && requirements.asset !== opts.mint.toBase58()) {
    throw new PaymentRejectedError(`server asks for token ${requirements.asset}`);
  }
  if (opts.maxAmount !== undefined && BigInt(requirements.maxAmountRequired) > BigInt(opts.maxAmount)) {
    throw new PaymentRejectedError(
      `price ${requirements.maxAmountRequired} is above the agent's maximum ${opts.maxAmount}`
    );
  }

  const payment = await createVaultPayment({
    connection: opts.connection,
    agent: opts.agent,
    vaultOwner: opts.vaultOwner,
    requirements,
  });

  const second = await doFetch(url, {
    ...init,
    headers: { ...(init?.headers as Record<string, string> | undefined), "X-PAYMENT": payment },
  });
  if (second.status === 402) {
    const body = (await second.json().catch(() => ({}))) as { error?: string };
    throw new PaymentRejectedError(body.error ?? "server refused the payment");
  }
  return second;
}
