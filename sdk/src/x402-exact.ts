/**
 * The standard x402 `exact` scheme on Solana, settled through a facilitator.
 *
 * `truvaPaywall` can offer this beside `truva-vault` (see `PaywallOptions.exact`
 * in ./x402). An `exact` payment is a plain SPL token transfer that the client
 * signs and a facilitator co-signs as fee payer and submits. The paywall does
 * not look inside the transaction: it forwards the client's payment payload
 * and its own payment requirements to the facilitator's `POST /verify` and
 * `POST /settle`, as the resource server does in the x402 specification.
 *
 * `exact` payments are NOT trust-gated. No Truva passport, tier, vault limit or
 * merchant policy is involved, because the TrustGate program never runs.
 *
 * Spec: https://github.com/coinbase/x402
 *   specs/schemes/exact/scheme_exact_svm.md   (requirements, extra.feePayer)
 *   specs/x402-specification-v1.md, section 7 (facilitator API, v1 bodies)
 *   specs/x402-specification-v2.md, section 7 (facilitator API, v2 bodies)
 *
 * This file does not import from ./x402, so ./x402 can import it.
 */

export const EXACT_SCHEME = "exact";

/** Facilitator endpoint a request is sent to. */
export type FacilitatorEndpoint = "supported" | "verify" | "settle";

/**
 * Extra HTTP headers for facilitator requests (e.g. an API key), fixed or
 * computed per request. The function form receives the endpoint being called,
 * for facilitators that sign each endpoint separately.
 */
export type FacilitatorHeaders =
  | Record<string, string>
  | ((endpoint: FacilitatorEndpoint) => Record<string, string> | Promise<Record<string, string>>);

/** `PaywallOptions.exact`: accept the standard x402 `exact` scheme as well. */
export interface ExactSchemeOptions {
  /**
   * Base URL of an x402 facilitator that supports `exact` on the paywall's
   * Solana network, e.g. "https://x402.org/facilitator". `/verify`, `/settle`
   * and `/supported` are appended to it.
   */
  facilitatorUrl: string;
  /**
   * The facilitator's fee payer address, advertised to clients as
   * `extra.feePayer`. If omitted it is read once from the facilitator's
   * `GET /supported` and cached.
   */
  feePayer?: string;
  /** Extra headers for facilitator requests (authentication). */
  headers?: FacilitatorHeaders;
  /** `fetch` used to reach the facilitator. Default: the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * `exact` payments skip every Truva trust check. A paywall with `minTier`
   * above Bronze therefore refuses to be built with `exact` unless this is
   * true, in which case the tier applies to `truva-vault` payments only and
   * anyone can pay through `exact`.
   */
  allowUngated?: boolean;
}

/** Scheme-specific data of an `exact` requirement on Solana. */
export interface ExactSvmExtra {
  /** Account that pays the transaction fee: the facilitator's signer */
  feePayer: string;
  [key: string]: unknown;
}

/** An `exact` payment requirement in x402 v1 field layout. */
export interface ExactPaymentRequirements {
  scheme: typeof EXACT_SCHEME;
  /** x402 v1 network name, e.g. "solana-devnet" */
  network: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra: ExactSvmExtra;
}

/** An `exact` payment requirement in x402 v2 field layout. */
export interface ExactPaymentRequirementsV2 {
  scheme: typeof EXACT_SCHEME;
  /** CAIP-2 network id */
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: ExactSvmExtra;
}

/** Body of `POST /verify` and `POST /settle` (x402 spec, section 7). */
export interface FacilitatorRequest {
  x402Version: 1 | 2;
  /** The client's PaymentPayload, exactly as decoded from its payment header */
  paymentPayload: Record<string, unknown>;
  /** The server's own requirement, in the layout of `x402Version` */
  paymentRequirements: ExactPaymentRequirements | ExactPaymentRequirementsV2;
}

export interface FacilitatorVerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface FacilitatorSettleResponse {
  success: boolean;
  errorReason?: string;
  payer?: string;
  /** Transaction signature; empty if settlement failed */
  transaction: string;
  network: string;
}

export interface FacilitatorSupportedKind {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: Record<string, unknown>;
}

export interface FacilitatorSupportedResponse {
  kinds: FacilitatorSupportedKind[];
  extensions?: string[];
  signers?: Record<string, string[]>;
}

/** The facilitator could not be reached or answered with something unusable. */
export class FacilitatorError extends Error {
  constructor(
    public readonly endpoint: FacilitatorEndpoint,
    message: string,
    /** HTTP status, if a response was received */
    public readonly status?: number
  ) {
    super(`facilitator /${endpoint} failed: ${message}`);
    this.name = "FacilitatorError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export interface FacilitatorClient {
  supported(): Promise<FacilitatorSupportedResponse>;
  verify(request: FacilitatorRequest): Promise<FacilitatorVerifyResponse>;
  settle(request: FacilitatorRequest): Promise<FacilitatorSettleResponse>;
}

/**
 * Minimal client for the x402 facilitator HTTP API.
 *
 * `verify` and `settle` return the facilitator's verdict whatever the HTTP
 * status, as long as the body carries one (`isValid` / `success`): some
 * facilitators answer a rejected payment with a 4xx. Anything else throws
 * `FacilitatorError`.
 */
export function createFacilitatorClient(
  options: Pick<ExactSchemeOptions, "facilitatorUrl" | "headers" | "fetch">
): FacilitatorClient {
  const base = options.facilitatorUrl.replace(/\/+$/, "");

  async function call(
    endpoint: FacilitatorEndpoint,
    body: FacilitatorRequest | undefined,
    verdictField: string
  ): Promise<Record<string, unknown>> {
    const doFetch = options.fetch ?? fetch;
    let res: Response;
    let text: string;
    // A facilitator that never answers must not hang the seller's route
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), endpoint === "supported" ? 10_000 : 60_000);
    try {
      const extra =
        typeof options.headers === "function" ? await options.headers(endpoint) : options.headers;
      res = await doFetch(`${base}/${endpoint}`, {
        method: body ? "POST" : "GET",
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...extra,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: abort.signal,
      });
      text = await res.text();
    } catch (err) {
      throw new FacilitatorError(
        endpoint,
        abort.signal.aborted ? "timed out" : (err as Error)?.message ?? String(err)
      );
    } finally {
      clearTimeout(timer);
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    if (!isRecord(json) || !(verdictField in json)) {
      throw new FacilitatorError(
        endpoint,
        res.ok ? "unexpected response body" : `HTTP ${res.status}`,
        res.status
      );
    }
    return json;
  }

  return {
    async supported() {
      const json = await call("supported", undefined, "kinds");
      if (!Array.isArray(json.kinds)) {
        throw new FacilitatorError("supported", "unexpected response body");
      }
      return json as unknown as FacilitatorSupportedResponse;
    },
    async verify(request) {
      const json = await call("verify", request, "isValid");
      return { ...json, isValid: json.isValid === true } as FacilitatorVerifyResponse;
    },
    async settle(request) {
      const json = await call("settle", request, "success");
      return {
        ...json,
        success: json.success === true,
        transaction: typeof json.transaction === "string" ? json.transaction : "",
        network: typeof json.network === "string" ? json.network : "",
      } as FacilitatorSettleResponse;
    },
  };
}

/**
 * The `extra.feePayer` a facilitator advertises for `exact` on a network, from
 * its `/supported` response. `networks` lists every name the network goes by
 * (x402 v1 name and CAIP-2 id); a facilitator lists v1 and v2 kinds separately.
 */
export function findExactFeePayer(
  supported: FacilitatorSupportedResponse,
  networks: readonly (string | undefined)[]
): string | undefined {
  for (const kind of supported.kinds) {
    if (!isRecord(kind) || kind.scheme !== EXACT_SCHEME || !networks.includes(kind.network)) continue;
    const feePayer = isRecord(kind.extra) ? kind.extra.feePayer : undefined;
    if (typeof feePayer === "string" && feePayer) return feePayer;
  }
  return undefined;
}

/** `exact` requirement in x402 v1 layout for the given price. */
export function buildExactRequirements(opts: {
  /** x402 v1 network name, e.g. "solana-devnet" */
  network: string;
  /** Price in token base units, as a decimal string */
  amount: string;
  /** Token mint address */
  asset: string;
  /** Seller wallet; the transfer goes to its associated token account */
  payTo: string;
  feePayer: string;
  resource: string;
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
}): ExactPaymentRequirements {
  return {
    scheme: EXACT_SCHEME,
    network: opts.network,
    maxAmountRequired: opts.amount,
    asset: opts.asset,
    payTo: opts.payTo,
    resource: opts.resource,
    description: opts.description ?? "",
    mimeType: opts.mimeType ?? "",
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 60,
    extra: { feePayer: opts.feePayer },
  };
}

/** The same requirement in x402 v2 layout. `network` must be a CAIP-2 id. */
export function toExactRequirementsV2(
  requirements: ExactPaymentRequirements,
  network: string
): ExactPaymentRequirementsV2 {
  return {
    scheme: EXACT_SCHEME,
    network,
    amount: requirements.maxAmountRequired,
    asset: requirements.asset,
    payTo: requirements.payTo,
    maxTimeoutSeconds: requirements.maxTimeoutSeconds,
    extra: requirements.extra,
  };
}
