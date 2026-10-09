/**
 * x402 paywall settled through a Truva agent vault.
 *
 * Flow (HTTP 402 handshake, x402 wire format):
 *   1. Agent requests a resource. Server answers 402 with payment requirements:
 *      an x402 v1 JSON body and, when the network has a CAIP-2 id, an x402 v2
 *      `PAYMENT-REQUIRED` header.
 *   2. Agent builds and signs a `vault_pay` transaction and retries with it in
 *      the `X-PAYMENT` header (v1) or the `PAYMENT-SIGNATURE` header (v2).
 *   3. Server checks the transaction pays it the right amount, submits it,
 *      waits for confirmation and serves the resource with a settlement
 *      receipt in `X-PAYMENT-RESPONSE` (v1) or `PAYMENT-RESPONSE` (v2).
 *
 * The messages follow the x402 specification, but the scheme is `truva-vault`,
 * not x402's stock `exact` scheme: the funds sit in a program-owned vault, so
 * payment is a `vault_pay` instruction rather than a plain token transfer, and
 * the server settles it itself instead of calling a third-party facilitator.
 * The program enforces the vault owner's limits, the agent's passport and the
 * seller's merchant policy at settlement.
 *
 * A seller that does not need trust gating can also accept the stock `exact`
 * scheme (`PaywallOptions.exact`): those payments are forwarded to an x402
 * facilitator's `/verify` and `/settle` and skip every Truva check. See
 * ./x402-exact.
 *
 * Spec: https://github.com/coinbase/x402 (specs/x402-specification-v1.md,
 * specs/x402-specification-v2.md, specs/transports-v1/http.md,
 * specs/transports-v2/http.md).
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
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TRUSTGATE_PROGRAM_ID,
  deriveAssociatedTokenAddress,
} from "./pda";
import type { TrustTier } from "./types";
import { TIER_RANK } from "./types";
import {
  EXACT_SCHEME,
  FacilitatorError,
  buildExactRequirements,
  createFacilitatorClient,
  findExactFeePayer,
  toExactRequirementsV2,
} from "./x402-exact";
import type {
  ExactPaymentRequirements,
  ExactPaymentRequirementsV2,
  ExactSchemeOptions,
  FacilitatorRequest,
} from "./x402-exact";

export const TRUVA_VAULT_SCHEME = "truva-vault";

/** x402 protocol versions this module reads and writes. */
export type X402Version = 1 | 2;

/** HTTP header names defined by the x402 HTTP transports. */
export const X402_HEADERS = {
  /** v1, client to server: base64 JSON PaymentPayload */
  paymentV1: "X-PAYMENT",
  /** v1, server to client: base64 JSON SettlementResponse */
  responseV1: "X-PAYMENT-RESPONSE",
  /** v2, server to client with the 402: base64 JSON PaymentRequired */
  requiredV2: "PAYMENT-REQUIRED",
  /** v2, client to server: base64 JSON PaymentPayload */
  paymentV2: "PAYMENT-SIGNATURE",
  /** v2, server to client: base64 JSON SettlementResponse */
  responseV2: "PAYMENT-RESPONSE",
} as const;

/** x402 v1 network name to x402 v2 (CAIP-2) network id, for Solana clusters. */
export const SOLANA_CAIP2_NETWORKS: Readonly<Record<string, string>> = {
  solana: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "solana-devnet": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  "solana-testnet": "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",
};

/**
 * CAIP-2 id for a network. Ids pass through unchanged; v1 names are mapped.
 * Returns undefined for a name with no CAIP-2 id (e.g. a local validator).
 */
export function toCaip2Network(network: string): string | undefined {
  if (network.includes(":")) return network;
  return SOLANA_CAIP2_NETWORKS[network];
}

/** x402 v1 name for a CAIP-2 id, or undefined if it has none. */
export function fromCaip2Network(network: string): string | undefined {
  if (!network.includes(":")) return network;
  return Object.keys(SOLANA_CAIP2_NETWORKS).find((k) => SOLANA_CAIP2_NETWORKS[k] === network);
}

function sameNetwork(a: unknown, b: string): boolean {
  if (typeof a !== "string") return false;
  return a === b || (toCaip2Network(a) !== undefined && toCaip2Network(a) === toCaip2Network(b));
}

/** Scheme-specific data of a `truva-vault` requirement. */
export interface TruvaVaultExtra {
  programId: string;
  /** Minimum trust tier the seller accepts */
  minTier: TrustTier;
}

/**
 * A `truva-vault` payment requirement, in x402 v1 field layout. This is one
 * entry of the `accepts` array in the 402 response body.
 */
export interface PaymentRequirements {
  scheme: typeof TRUVA_VAULT_SCHEME;
  /** x402 v1 name ("solana", "solana-devnet") or a CAIP-2 id */
  network: string;
  /** Price in token base units, as a decimal string */
  maxAmountRequired: string;
  /** Token mint address */
  asset: string;
  /** Seller wallet (payment goes to its associated token account) */
  payTo: string;
  /** URL of the resource being paid for */
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra: TruvaVaultExtra;
}

/** The same requirement in x402 v2 field layout. */
export interface PaymentRequirementsV2 {
  scheme: typeof TRUVA_VAULT_SCHEME;
  /** CAIP-2 network id */
  network: string;
  /** Price in token base units, as a decimal string */
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: TruvaVaultExtra;
}

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

/** x402 v1 402 response body. */
export interface PaymentRequiredV1 {
  x402Version: 1;
  error: string;
  accepts: PaymentRequirements[];
}

/** x402 v2 PaymentRequired object (the decoded `PAYMENT-REQUIRED` header). */
export interface PaymentRequiredV2 {
  x402Version: 2;
  error?: string;
  resource: ResourceInfo;
  accepts: PaymentRequirementsV2[];
}

/** A decoded payment header, v1 or v2, reduced to what settlement needs. */
export interface DecodedPaymentPayload {
  x402Version: X402Version;
  scheme: string;
  network: string;
  /** base64 serialized, agent-signed transaction */
  transaction: string;
  /** v2 only: the requirement the client says it is paying */
  accepted?: Record<string, unknown>;
}

/** x402 SettlementResponse, plus the fields earlier SDK versions returned. */
export interface SettlementResponse {
  success: boolean;
  /** Transaction signature; empty string if settlement failed */
  transaction: string;
  network: string;
  payer?: string;
  errorReason?: string;
  /** Amount settled, in token base units */
  amount?: string;
  /** Same as `transaction`. Not part of x402; kept for existing callers. */
  signature?: string;
}

export interface SettledPayment {
  signature: string;
  /** The agent that paid (for `exact`: the payer the facilitator reports) */
  payer: string;
  amount: string;
  network: string;
  /**
   * Scheme the payment was settled with: "truva-vault" or "exact". An `exact`
   * payment passed no Truva trust check.
   */
  scheme?: string;
}

/** Thrown when a payment is refused, by the server or by the buyer's own guard. */
export class PaymentRejectedError extends Error {
  constructor(public readonly reason: string) {
    super(`Payment rejected: ${reason}`);
    this.name = "PaymentRejectedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Wire encoding ────────────────────────────────────────────────────────────

/** base64(JSON), the encoding of every x402 header. */
export function encodeX402Header(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

/** Decode a base64 JSON x402 header. Throws if it is not a JSON object. */
export function decodeX402Header<T = Record<string, unknown>>(header: string): T {
  const value = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("x402 header is not a JSON object");
  }
  return value as T;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const isAmount = (v: unknown): v is string => typeof v === "string" && /^\d+$/.test(v);

function isAddress(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try {
    new PublicKey(v);
    return true;
  } catch {
    return false;
  }
}

/** x402 v1 402 response body for the given requirements. */
export function buildPaymentRequired(
  requirements: PaymentRequirements | PaymentRequirements[],
  error = "X-PAYMENT header is required"
): PaymentRequiredV1 {
  return {
    x402Version: 1,
    error,
    accepts: Array.isArray(requirements) ? requirements : [requirements],
  };
}

/** One requirement in x402 v2 layout, or null if its network has no CAIP-2 id. */
export function toPaymentRequirementsV2(
  requirements: PaymentRequirements
): PaymentRequirementsV2 | null {
  const network = toCaip2Network(requirements.network);
  if (!network) return null;
  return {
    scheme: requirements.scheme,
    network,
    amount: requirements.maxAmountRequired,
    asset: requirements.asset,
    payTo: requirements.payTo,
    maxTimeoutSeconds: requirements.maxTimeoutSeconds,
    extra: requirements.extra,
  };
}

/**
 * x402 v2 PaymentRequired object (the `PAYMENT-REQUIRED` header before
 * encoding). Returns null if the network has no CAIP-2 id, since v2 requires one.
 */
export function buildPaymentRequiredV2(
  requirements: PaymentRequirements,
  error = "PAYMENT-SIGNATURE header is required"
): PaymentRequiredV2 | null {
  const v2 = toPaymentRequirementsV2(requirements);
  if (!v2) return null;
  const resource: ResourceInfo = { url: requirements.resource };
  if (requirements.description) resource.description = requirements.description;
  if (requirements.mimeType) resource.mimeType = requirements.mimeType;
  return { x402Version: 2, error, resource, accepts: [v2] };
}

/**
 * Pick the first well-formed `truva-vault` requirement out of a 402 challenge.
 * Accepts an x402 v1 body or a v2 PaymentRequired object (or its base64 header
 * form). Entries with other schemes (`exact`, ...) and malformed entries are
 * skipped. v2 entries are returned in v1 layout.
 */
export function selectVaultRequirements(
  challenge: unknown
): { x402Version: X402Version; requirements: PaymentRequirements } | undefined {
  let parsed = challenge;
  if (typeof parsed === "string") {
    try {
      parsed = decodeX402Header(parsed);
    } catch {
      return undefined;
    }
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.accepts)) return undefined;
  const x402Version: X402Version = parsed.x402Version === 2 ? 2 : 1;
  const resource = isRecord(parsed.resource) ? parsed.resource : {};

  for (const entry of parsed.accepts) {
    if (!isRecord(entry) || entry.scheme !== TRUVA_VAULT_SCHEME) continue;
    const amount = x402Version === 2 ? entry.amount : entry.maxAmountRequired;
    const extra = entry.extra;
    if (
      typeof entry.network !== "string" ||
      !isAmount(amount) ||
      !isAddress(entry.asset) ||
      !isAddress(entry.payTo) ||
      !isRecord(extra) ||
      !isAddress(extra.programId)
    ) {
      continue;
    }
    const pick = (a: unknown, b: unknown) => (typeof a === "string" ? a : typeof b === "string" ? b : "");
    return {
      x402Version,
      requirements: {
        scheme: TRUVA_VAULT_SCHEME,
        network: entry.network,
        maxAmountRequired: amount,
        asset: entry.asset,
        payTo: entry.payTo,
        resource: pick(entry.resource, resource.url),
        description: pick(entry.description, resource.description),
        mimeType: pick(entry.mimeType, resource.mimeType),
        maxTimeoutSeconds: typeof entry.maxTimeoutSeconds === "number" ? entry.maxTimeoutSeconds : 60,
        extra: {
          ...extra,
          programId: extra.programId,
          minTier: (typeof extra.minTier === "string" && extra.minTier in TIER_RANK
            ? extra.minTier
            : "Bronze") as TrustTier,
        },
      },
    };
  }
  return undefined;
}

/**
 * Encode a payment header value: the `X-PAYMENT` value for version 1, the
 * `PAYMENT-SIGNATURE` value for version 2.
 *
 * @param transaction base64 serialized, signed transaction
 */
export function encodePaymentPayload(
  requirements: PaymentRequirements,
  transaction: string,
  x402Version: X402Version = 1
): string {
  if (x402Version === 2) {
    const accepted = toPaymentRequirementsV2(requirements);
    if (!accepted) {
      throw new Error(`Network "${requirements.network}" has no CAIP-2 id; use x402 version 1`);
    }
    const resource: ResourceInfo = { url: requirements.resource };
    if (requirements.description) resource.description = requirements.description;
    if (requirements.mimeType) resource.mimeType = requirements.mimeType;
    return encodeX402Header({ x402Version: 2, resource, accepted, payload: { transaction } });
  }
  return encodeX402Header({
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: { transaction },
  });
}

/**
 * Decode an `X-PAYMENT` (v1) or `PAYMENT-SIGNATURE` (v2) header value.
 *
 * @throws PaymentRejectedError if it is not a well-formed x402 payment payload
 */
export function decodePaymentPayload(header: string): DecodedPaymentPayload {
  const malformed = new PaymentRejectedError("malformed payment header");
  let decoded: Record<string, unknown>;
  try {
    decoded = decodeX402Header(header);
  } catch {
    throw malformed;
  }
  const payload = decoded.payload;
  if (!isRecord(payload) || typeof payload.transaction !== "string") throw malformed;

  if (decoded.x402Version === 2) {
    const accepted = decoded.accepted;
    if (!isRecord(accepted) || typeof accepted.scheme !== "string" || typeof accepted.network !== "string") {
      throw malformed;
    }
    return {
      x402Version: 2,
      scheme: accepted.scheme,
      network: accepted.network,
      transaction: payload.transaction,
      accepted,
    };
  }
  if (typeof decoded.scheme !== "string" || typeof decoded.network !== "string") throw malformed;
  return {
    x402Version: 1,
    scheme: decoded.scheme,
    network: decoded.network,
    transaction: payload.transaction,
  };
}

/** Decode an `X-PAYMENT-RESPONSE` or `PAYMENT-RESPONSE` header value. */
export function decodeSettlementResponse(header: string): SettlementResponse {
  return decodeX402Header<SettlementResponse>(header);
}

// ── Seller side ──────────────────────────────────────────────────────────────

export function buildPaymentRequirements(opts: {
  payTo: PublicKey;
  mint: PublicKey;
  /** Price in token base units */
  amount: bigint | number;
  /** URL of the resource. x402 expects an absolute URL. */
  resource: string;
  /** x402 v1 name or CAIP-2 id. Default "solana-devnet". */
  network?: string;
  minTier?: TrustTier;
  description?: string;
  /** MIME type of the paid response */
  mimeType?: string;
  maxTimeoutSeconds?: number;
  programId?: PublicKey;
}): PaymentRequirements {
  return {
    scheme: TRUVA_VAULT_SCHEME,
    network: opts.network ?? "solana-devnet",
    maxAmountRequired: BigInt(opts.amount).toString(),
    asset: opts.mint.toBase58(),
    payTo: opts.payTo.toBase58(),
    resource: opts.resource,
    description: opts.description ?? "",
    mimeType: opts.mimeType ?? "",
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 60,
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
 * Verify a payment header (`X-PAYMENT` or `PAYMENT-SIGNATURE` value) against
 * the requirements, submit the transaction and wait for confirmation.
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
  const decoded = decodePaymentPayload(paymentHeader);
  if (decoded.scheme !== requirements.scheme || !sameNetwork(decoded.network, requirements.network)) {
    throw new PaymentRejectedError("scheme or network does not match");
  }
  let tx: Transaction;
  try {
    tx = Transaction.from(Buffer.from(decoded.transaction, "base64"));
  } catch {
    throw new PaymentRejectedError("malformed payment header");
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
  // vault_pay accounts: [4] recipient token account, [6] mint, [7] agent, [8] token program
  const tokenProgram = ix.keys[8].pubkey;
  if (!tokenProgram.equals(TOKEN_PROGRAM_ID) && !tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
    throw new PaymentRejectedError("payment uses an unknown token program");
  }
  if (!ix.keys[4].pubkey.equals(deriveAssociatedTokenAddress(mint, payTo, tokenProgram))) {
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
    scheme: TRUVA_VAULT_SCHEME,
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
  /** x402 v1 name or CAIP-2 id. Default "solana-devnet". */
  network?: string;
  description?: string;
  /** MIME type of the paid response */
  mimeType?: string;
  /**
   * Absolute URL of the resource. By default it is built from the request
   * (protocol, Host header, path); set it when running behind a proxy that
   * rewrites them.
   */
  resource?: string;
  programId?: PublicKey;
  /**
   * Also accept the standard x402 `exact` scheme, verified and settled by a
   * facilitator, so stock x402 clients can pay. The 402 response then lists
   * two requirements for the same token, amount and seller: `truva-vault`
   * first, `exact` second.
   *
   * `exact` payments are plain token transfers and bypass every Truva check
   * (passport, tier, vault limits, merchant policy). `truvaPaywall` throws if
   * this is set together with a `minTier` above Bronze, unless
   * `exact.allowUngated` is true.
   */
  exact?: ExactSchemeOptions;
}

/** How long a failed `/supported` lookup is remembered before retrying. */
const FEE_PAYER_RETRY_MS = 30_000;

/** Absolute URL of the request, as x402 expects in `resource`. */
function requestUrl(req: any): string {
  const path: string = req.originalUrl ?? req.url ?? "/";
  if (/^https?:\/\//i.test(path)) return path;
  const host = req.headers?.host;
  if (typeof host !== "string" || !host) return path;
  const protocol = req.protocol ?? (req.socket?.encrypted ? "https" : "http");
  return `${protocol}://${host}${path}`;
}

/**
 * Express-style middleware (also works with a bare Node `http` server) that
 * charges `amount` per request.
 *
 * Unpaid or refused requests get HTTP 402 with an x402 v1 JSON body and, when
 * the network has a CAIP-2 id, an x402 v2 `PAYMENT-REQUIRED` header. Payment is
 * read from `X-PAYMENT` (v1) or `PAYMENT-SIGNATURE` (v2). On success the
 * settled payment is attached as `req.truvaPayment` and the receipt is sent in
 * `X-PAYMENT-RESPONSE` (v1) or `PAYMENT-RESPONSE` (v2), matching the request.
 *
 * With `options.exact` the 402 also lists a standard x402 `exact` requirement,
 * and a payment with that scheme is sent to the facilitator's `/verify` and
 * then `/settle`; a rejection by either is a 402 with the facilitator's reason.
 * `req.truvaPayment.scheme` tells the handler which scheme paid. `exact`
 * payments pass no Truva trust check.
 *
 * @throws Error when built with `exact` and a `minTier` above Bronze without
 *   `exact.allowUngated`, or with a malformed `exact` option.
 */
export function truvaPaywall(options: PaywallOptions) {
  const exact = options.exact;
  const networkName = options.network ?? "solana-devnet";
  const caip2 = toCaip2Network(networkName);
  /** x402 v1 name of the network, used in the v1 `exact` requirement */
  const v1Network = fromCaip2Network(networkName) ?? networkName;

  if (exact) {
    if (typeof exact.facilitatorUrl !== "string" || !/^https?:\/\//i.test(exact.facilitatorUrl)) {
      throw new Error("truvaPaywall: exact.facilitatorUrl must be an http(s) URL");
    }
    if (exact.feePayer !== undefined && !isAddress(exact.feePayer)) {
      throw new Error("truvaPaywall: exact.feePayer is not a Solana address");
    }
    const minTier = options.minTier ?? "Bronze";
    if (TIER_RANK[minTier] > TIER_RANK.Bronze && !exact.allowUngated) {
      throw new Error(
        `truvaPaywall: this route requires the ${minTier} tier, but x402 "exact" payments bypass ` +
          "Truva trust checks (no passport, no vault limits). Remove `exact`, or set " +
          "`exact.allowUngated: true` to let anyone pay through `exact`."
      );
    }
  }

  const facilitator = exact ? createFacilitatorClient(exact) : undefined;
  let feePayerLookup: Promise<string> | undefined;
  let feePayerError: unknown;
  let feePayerRetryAt = 0;

  /** The facilitator's fee payer: configured, or read once from `/supported`. */
  const resolveFeePayer = (): Promise<string> => {
    if (exact!.feePayer) return Promise.resolve(exact!.feePayer);
    if (feePayerLookup) return feePayerLookup;
    if (Date.now() < feePayerRetryAt) return Promise.reject(feePayerError);
    const lookup = facilitator!.supported().then((supported) => {
      const feePayer = findExactFeePayer(supported, [v1Network, caip2, networkName]);
      if (!isAddress(feePayer)) {
        throw new FacilitatorError("supported", `no "exact" kind with a feePayer for ${networkName}`);
      }
      return feePayer;
    });
    feePayerLookup = lookup;
    lookup.catch((err) => {
      feePayerLookup = undefined;
      feePayerError = err;
      feePayerRetryAt = Date.now() + FEE_PAYER_RETRY_MS;
    });
    return lookup;
  };

  return async (req: any, res: any, next: () => void): Promise<void> => {
    const requirements = buildPaymentRequirements({
      ...options,
      resource: options.resource ?? requestUrl(req),
    });

    // The `exact` requirement, if offered and the fee payer is known. When the
    // facilitator cannot be reached the route still sells through truva-vault.
    let exactV1: ExactPaymentRequirements | undefined;
    let exactV2: ExactPaymentRequirementsV2 | undefined;
    let exactUnavailable = "";
    if (exact) {
      try {
        exactV1 = buildExactRequirements({
          network: v1Network,
          amount: requirements.maxAmountRequired,
          asset: requirements.asset,
          payTo: requirements.payTo,
          feePayer: await resolveFeePayer(),
          resource: requirements.resource,
          description: requirements.description,
          mimeType: requirements.mimeType,
          maxTimeoutSeconds: requirements.maxTimeoutSeconds,
        });
        if (caip2) exactV2 = toExactRequirementsV2(exactV1, caip2);
      } catch (err) {
        exactUnavailable = (err as Error)?.message ?? String(err);
      }
    }

    const headerV2 = req.headers?.[X402_HEADERS.paymentV2.toLowerCase()];
    const headerV1 = req.headers?.[X402_HEADERS.paymentV1.toLowerCase()];
    const isV2 = typeof headerV2 === "string" && headerV2 !== "";
    const header = isV2 ? headerV2 : headerV1;
    const responseHeader = isV2 ? X402_HEADERS.responseV2 : X402_HEADERS.responseV1;
    const receiptNetwork = isV2
      ? toCaip2Network(requirements.network) ?? requirements.network
      : requirements.network;

    const refuse = (error: string, settlementFailed: boolean, payer?: string) => {
      res.statusCode = 402;
      res.setHeader("Content-Type", "application/json");
      const v2 = buildPaymentRequiredV2(requirements, error);
      if (v2) {
        const accepts = exactV2 ? [...v2.accepts, exactV2] : v2.accepts;
        res.setHeader(X402_HEADERS.requiredV2, encodeX402Header({ ...v2, accepts }));
      }
      if (settlementFailed) {
        const failure: SettlementResponse = {
          success: false,
          errorReason: error,
          transaction: "",
          network: receiptNetwork,
        };
        if (payer) failure.payer = payer;
        res.setHeader(responseHeader, encodeX402Header(failure));
      }
      const v1 = buildPaymentRequired(requirements, error);
      res.end(JSON.stringify(exactV1 ? { ...v1, accepts: [...v1.accepts, exactV1] } : v1));
    };

    if (!header || typeof header !== "string") {
      refuse("X-PAYMENT header is required", false);
      return;
    }

    // Standard `exact` payment: the facilitator verifies and settles it
    if (exact && facilitator) {
      let payload: Record<string, unknown> | undefined;
      try {
        payload = decodeX402Header(header);
      } catch {
        payload = undefined; // settleVaultPayment below reports it as malformed
      }
      const payloadVersion: X402Version = payload?.x402Version === 2 ? 2 : 1;
      const accepted = payload && isRecord(payload.accepted) ? payload.accepted : undefined;
      const scheme = payloadVersion === 2 ? accepted?.scheme : payload?.scheme;

      if (payload && scheme === EXACT_SCHEME) {
        const paymentRequirements = payloadVersion === 2 ? exactV2 : exactV1;
        if (!exactV1) {
          refuse(`exact payments are unavailable: ${exactUnavailable}`, true);
          return;
        }
        if (!paymentRequirements) {
          refuse(`network "${networkName}" has no CAIP-2 id; pay with x402 version 1`, true);
          return;
        }
        if (!isRecord(payload.payload)) {
          refuse("malformed payment header", true);
          return;
        }
        if (payloadVersion === 2) {
          // The client echoes the requirement it chose; it must be the one offered
          const extra = isRecord(accepted!.extra) ? accepted!.extra : {};
          if (
            accepted!.network !== exactV2!.network ||
            accepted!.amount !== exactV2!.amount ||
            accepted!.asset !== exactV2!.asset ||
            accepted!.payTo !== exactV2!.payTo ||
            extra.feePayer !== exactV2!.extra.feePayer
          ) {
            refuse("accepted requirement does not match what this server offers", true);
            return;
          }
        } else if (!sameNetwork(payload.network, networkName)) {
          refuse("scheme or network does not match", true);
          return;
        }

        const request: FacilitatorRequest = {
          x402Version: payloadVersion,
          paymentPayload: payload,
          paymentRequirements,
        };
        let payer: string | undefined;
        try {
          const verified = await facilitator.verify(request);
          if (typeof verified.payer === "string" && verified.payer) payer = verified.payer;
          if (!verified.isValid) {
            refuse(verified.invalidReason || "payment verification failed", true, payer);
            return;
          }
          const settlement = await facilitator.settle(request);
          if (typeof settlement.payer === "string" && settlement.payer) payer = settlement.payer;
          if (!settlement.success || !settlement.transaction) {
            refuse(settlement.errorReason || "payment settlement failed", true, payer);
            return;
          }
          const settled: SettledPayment = {
            signature: settlement.transaction,
            payer: payer ?? "",
            amount: requirements.maxAmountRequired,
            network: requirements.network,
            scheme: EXACT_SCHEME,
          };
          req.truvaPayment = settled;
          const receipt: SettlementResponse = {
            success: true,
            transaction: settlement.transaction,
            network: receiptNetwork,
          };
          if (payer) receipt.payer = payer;
          res.setHeader(responseHeader, encodeX402Header(receipt));
        } catch (err) {
          if (err instanceof FacilitatorError) {
            refuse(err.message, true, payer);
            return;
          }
          throw err;
        }
        next();
        return;
      }
    }

    try {
      const settled = await settleVaultPayment(options.connection, header, requirements);
      req.truvaPayment = settled;
      const receipt: SettlementResponse = {
        success: true,
        transaction: settled.signature,
        network: receiptNetwork,
        payer: settled.payer,
        amount: settled.amount,
        signature: settled.signature,
      };
      res.setHeader(responseHeader, encodeX402Header(receipt));
      next();
    } catch (err) {
      if (err instanceof PaymentRejectedError) {
        refuse(err.reason, true);
        return;
      }
      throw err;
    }
  };
}

// ── Buyer side ───────────────────────────────────────────────────────────────

/**
 * The token program that owns `mint`: Token-2022 when the mint account says so,
 * classic SPL Token otherwise (including when the mint cannot be read).
 */
async function tokenProgramOf(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  try {
    const info = await connection.getAccountInfo(mint);
    if (info?.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  } catch {
    // fall through to the classic program
  }
  return TOKEN_PROGRAM_ID;
}

/**
 * Build and sign a payment header value for a `truva-vault` requirement: the
 * `X-PAYMENT` value by default, the `PAYMENT-SIGNATURE` value with
 * `x402Version: 2`. The agent signs and pays the transaction fee; the tokens
 * come from the vault.
 */
export async function createVaultPayment(opts: {
  connection: Connection;
  /** The agent's keypair */
  agent: Signer;
  /** Wallet that owns the vault the agent spends from */
  vaultOwner: PublicKey;
  requirements: PaymentRequirements;
  /** Default 1 */
  x402Version?: X402Version;
}): Promise<string> {
  const { connection, agent, vaultOwner, requirements } = opts;
  const mint = new PublicKey(requirements.asset);

  const tx = new Transaction().add(
    vaultPayIx(
      vaultOwner,
      agent.publicKey,
      mint,
      new PublicKey(requirements.payTo),
      BigInt(requirements.maxAmountRequired),
      new PublicKey(requirements.extra.programId),
      await tokenProgramOf(connection, mint)
    )
  );
  tx.feePayer = agent.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(agent);

  return encodePaymentPayload(requirements, tx.serialize().toString("base64"), opts.x402Version ?? 1);
}

export interface FetchWithVaultOptions {
  connection: Connection;
  agent: Signer;
  vaultOwner: PublicKey;
  /** Refuse to pay more than this (token base units), whatever the server asks */
  maxAmount?: bigint | number;
  /** Refuse to pay in any other token */
  mint?: PublicKey;
  /**
   * The only program the agent will sign a payment for. The server names the
   * program in its 402 response, so this is checked before signing.
   * Default: the TrustGate program.
   */
  programId?: PublicKey;
  fetch?: typeof fetch;
}

/** Why a second 402 was returned: body `error`, else the v2 headers. */
async function refusalReason(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (typeof body?.error === "string" && body.error) return body.error;
  for (const [name, field] of [
    [X402_HEADERS.responseV2, "errorReason"],
    [X402_HEADERS.requiredV2, "error"],
  ] as const) {
    const value = res.headers.get(name);
    if (!value) continue;
    try {
      const reason = decodeX402Header(value)[field];
      if (typeof reason === "string" && reason) return reason;
    } catch {
      // not a readable x402 header
    }
  }
  return "server refused the payment";
}

/**
 * `fetch` that pays a `truva-vault` 402 challenge from the agent's vault and
 * retries once. Reads the x402 v1 body, or the v2 `PAYMENT-REQUIRED` header if
 * the body carries no `truva-vault` requirement, and answers in the same
 * version. Other schemes in `accepts` are ignored.
 *
 * @throws PaymentRejectedError if the server offers no `truva-vault`
 *   requirement, the price is above `maxAmount`, the token is not `mint`, the
 *   program is not `programId`, or the server refuses the payment.
 */
export async function fetchWithVault(
  url: string,
  init: RequestInit | undefined,
  opts: FetchWithVaultOptions
): Promise<Response> {
  const doFetch = opts.fetch ?? fetch;

  const first = await doFetch(url, init);
  if (first.status !== 402) return first;

  const body = await first.json().catch(() => undefined);
  const challenge =
    selectVaultRequirements(body) ??
    selectVaultRequirements(first.headers.get(X402_HEADERS.requiredV2) ?? undefined);
  if (!challenge) {
    throw new PaymentRejectedError("server does not accept truva-vault payments");
  }
  const { requirements, x402Version } = challenge;

  const programId = (opts.programId ?? TRUSTGATE_PROGRAM_ID).toBase58();
  if (requirements.extra.programId !== programId) {
    throw new PaymentRejectedError(`server asks for payment through program ${requirements.extra.programId}`);
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
    x402Version,
  });

  const headers = new Headers(init?.headers);
  headers.set(x402Version === 2 ? X402_HEADERS.paymentV2 : X402_HEADERS.paymentV1, payment);
  const second = await doFetch(url, { ...init, headers });
  if (second.status === 402) {
    throw new PaymentRejectedError(await refusalReason(second));
  }
  return second;
}
