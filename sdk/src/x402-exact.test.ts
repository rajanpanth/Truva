import * as http from "http";
import type { AddressInfo } from "net";
import { Keypair } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  X402_HEADERS,
  decodeSettlementResponse,
  decodeX402Header,
  encodeX402Header,
  fetchWithVault,
  selectVaultRequirements,
  truvaPaywall,
} from "./x402";
import type { PaywallOptions } from "./x402";
import {
  EXACT_SCHEME,
  FacilitatorError,
  createFacilitatorClient,
  findExactFeePayer,
} from "./x402-exact";
import type { FacilitatorSupportedResponse } from "./x402-exact";

const DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const FACILITATOR = "https://facilitator.test/api";
const seller = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const feePayer = Keypair.generate().publicKey.toBase58();
const buyer = Keypair.generate().publicKey.toBase58();

/** `/supported` in the shape https://x402.org/facilitator/supported returns. */
const supportedBody: FacilitatorSupportedResponse = {
  kinds: [
    { x402Version: 2, scheme: "exact", network: "eip155:84532" },
    { x402Version: 2, scheme: "exact", network: DEVNET, extra: { feePayer } },
    { x402Version: 1, scheme: "exact", network: "base-sepolia" },
    { x402Version: 1, scheme: "exact", network: "solana-devnet", extra: { feePayer } },
  ],
  extensions: [],
  signers: { "solana:*": [feePayer] },
};

interface Call {
  method: string;
  path: string;
  headers: Headers;
  body: any;
}

/** A facilitator behind an injected `fetch`; answers are set per test. */
function mockFacilitator() {
  const state = {
    calls: [] as Call[],
    supported: (): Response => Response.json(supportedBody),
    verify: (): Response => Response.json({ isValid: true, payer: buyer }),
    settle: (): Response =>
      Response.json({ success: true, payer: buyer, transaction: "5igSettled", network: DEVNET }),
  };
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith(`${FACILITATOR}/`)) throw new Error(`unexpected request to ${url}`);
    const path = url.slice(FACILITATOR.length);
    state.calls.push({
      method: init?.method ?? "GET",
      path,
      headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    if (path === "/supported") return state.supported();
    if (path === "/verify") return state.verify();
    if (path === "/settle") return state.settle();
    return new Response("not found", { status: 404 });
  };
  return { state, fetch: fetchImpl };
}

describe("truvaPaywall with the x402 exact scheme", () => {
  const facilitator = mockFacilitator();
  const lookup = mockFacilitator();
  const broken = mockFacilitator();
  broken.state.supported = () => new Response("down", { status: 503 });
  const defaults = { ...facilitator.state };

  // The vault path must never be reached by an exact payment
  const connection = new Proxy({}, {
    get: (_t, prop) => () => {
      throw new Error(`connection.${String(prop)} called for an exact payment`);
    },
  }) as unknown as Connection;

  const base: PaywallOptions = { connection, payTo: seller, mint, amount: 1_500_000 };
  const exact = { facilitatorUrl: FACILITATOR, feePayer, fetch: facilitator.fetch };

  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const routes: Record<string, ReturnType<typeof truvaPaywall>> = {
      "/both": truvaPaywall({
        ...base,
        description: "Weekly report",
        mimeType: "application/json",
        exact: { ...exact, headers: { Authorization: "Bearer test-key" } },
      }),
      "/lookup": truvaPaywall({
        ...base,
        exact: {
          facilitatorUrl: `${FACILITATOR}/`,
          fetch: lookup.fetch,
          headers: async (endpoint) => ({ "X-Endpoint": endpoint }),
        },
      }),
      "/broken": truvaPaywall({ ...base, exact: { facilitatorUrl: FACILITATOR, fetch: broken.fetch } }),
      "/caip2": truvaPaywall({ ...base, network: DEVNET, exact }),
      "/local": truvaPaywall({ ...base, network: "solana-localnet", exact }),
      "/vault-only": truvaPaywall(base),
      "/gated-open": truvaPaywall({ ...base, minTier: "Gold", exact: { ...exact, allowUngated: true } }),
    };
    server = http.createServer((req, res) => {
      const gate = routes[req.url ?? ""];
      if (!gate) {
        res.statusCode = 404;
        res.end();
        return;
      }
      gate(req, res, () => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify((req as any).truvaPayment));
      }).catch((err) => {
        res.statusCode = 500;
        res.end(String(err));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    Object.assign(facilitator.state, defaults, { calls: [] });
  });

  const exactV1 = (route: string, network = "solana-devnet") => ({
    scheme: "exact",
    network,
    maxAmountRequired: "1500000",
    asset: mint.toBase58(),
    payTo: seller.toBase58(),
    resource: `${baseUrl}${route}`,
    description: "",
    mimeType: "",
    maxTimeoutSeconds: 60,
    extra: { feePayer },
  });
  const exactV2 = {
    scheme: "exact",
    network: DEVNET,
    amount: "1500000",
    asset: mint.toBase58(),
    payTo: seller.toBase58(),
    maxTimeoutSeconds: 60,
    extra: { feePayer },
  };

  /** What a stock x402 client sends: a partially signed transfer, opaque to us. */
  const payloadV1 = {
    x402Version: 1,
    scheme: "exact",
    network: "solana-devnet",
    payload: { transaction: "AQAAAA==" },
  };
  const payloadV2 = (route: string) => ({
    x402Version: 2,
    resource: { url: `${baseUrl}${route}` },
    accepted: exactV2,
    payload: { transaction: "AQAAAA==" },
  });
  const payV1 = (route: string, payload: unknown = payloadV1) =>
    fetch(`${baseUrl}${route}`, { headers: { [X402_HEADERS.paymentV1]: encodeX402Header(payload) } });
  const payV2 = (route: string, payload: unknown = payloadV2(route)) =>
    fetch(`${baseUrl}${route}`, { headers: { [X402_HEADERS.paymentV2]: encodeX402Header(payload) } });

  it("402 lists truva-vault then exact, in the v1 body and the v2 header", async () => {
    const res = await fetch(`${baseUrl}/both`);
    expect(res.status).toBe(402);

    const body = await res.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts.map((a: any) => a.scheme)).toEqual(["truva-vault", "exact"]);
    expect(body.accepts[1]).toEqual({
      ...exactV1("/both"),
      description: "Weekly report",
      mimeType: "application/json",
    });
    // Same asset, amount and seller as the truva-vault entry
    for (const field of ["network", "maxAmountRequired", "asset", "payTo", "resource"]) {
      expect(body.accepts[1][field]).toBe(body.accepts[0][field]);
    }

    const v2 = decodeX402Header<any>(res.headers.get(X402_HEADERS.requiredV2)!);
    expect(v2.x402Version).toBe(2);
    expect(v2.accepts.map((a: any) => a.scheme)).toEqual(["truva-vault", "exact"]);
    expect(v2.accepts[1]).toEqual(exactV2);

    // feePayer was configured, so the facilitator was not asked
    expect(facilitator.state.calls).toHaveLength(0);
    // The buyer-side helper still finds its own scheme
    expect(selectVaultRequirements(body)?.requirements.scheme).toBe("truva-vault");
  });

  it("a paywall without the option offers truva-vault only", async () => {
    const body = await (await fetch(`${baseUrl}/vault-only`)).json();
    expect(body.accepts.map((a: any) => a.scheme)).toEqual(["truva-vault"]);
  });

  it("reads feePayer from the facilitator's /supported once and caches it", async () => {
    for (let i = 0; i < 3; i++) {
      const body = await (await fetch(`${baseUrl}/lookup`)).json();
      expect(body.accepts[1].extra).toEqual({ feePayer });
    }
    expect(lookup.state.calls).toHaveLength(1);
    expect(lookup.state.calls[0]).toMatchObject({ method: "GET", path: "/supported" });
    expect(lookup.state.calls[0].headers.get("X-Endpoint")).toBe("supported");
  });

  it("offers truva-vault alone while the facilitator's /supported is failing", async () => {
    const res = await fetch(`${baseUrl}/broken`);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.accepts.map((a: any) => a.scheme)).toEqual(["truva-vault"]);
    const v2 = decodeX402Header<any>(res.headers.get(X402_HEADERS.requiredV2)!);
    expect(v2.accepts).toHaveLength(1);

    const paid = await payV1("/broken");
    expect(paid.status).toBe(402);
    expect((await paid.json()).error).toContain("exact payments are unavailable");
    // One failed lookup is remembered; no verify or settle was attempted
    expect(broken.state.calls.map((c) => c.path)).toEqual(["/supported"]);
  });

  it("v1: X-PAYMENT goes to /verify then /settle, receipt in X-PAYMENT-RESPONSE", async () => {
    const res = await payV1("/both");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      signature: "5igSettled",
      payer: buyer,
      amount: "1500000",
      network: "solana-devnet",
      scheme: EXACT_SCHEME,
    });

    const { calls } = facilitator.state;
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /verify", "POST /settle"]);
    const expected = {
      x402Version: 1,
      paymentPayload: payloadV1,
      paymentRequirements: {
        ...exactV1("/both"),
        description: "Weekly report",
        mimeType: "application/json",
      },
    };
    expect(calls[0].body).toEqual(expected);
    expect(calls[1].body).toEqual(expected);
    for (const call of calls) {
      expect(call.headers.get("Content-Type")).toBe("application/json");
      expect(call.headers.get("Authorization")).toBe("Bearer test-key");
    }

    expect(res.headers.get(X402_HEADERS.responseV2)).toBeNull();
    expect(decodeSettlementResponse(res.headers.get(X402_HEADERS.responseV1)!)).toEqual({
      success: true,
      transaction: "5igSettled",
      network: "solana-devnet",
      payer: buyer,
    });
  });

  it("v2: PAYMENT-SIGNATURE goes to /verify then /settle, receipt in PAYMENT-RESPONSE", async () => {
    const payload = payloadV2("/both");
    const res = await payV2("/both", payload);
    expect(res.status).toBe(200);
    expect((await res.json()).scheme).toBe(EXACT_SCHEME);

    const { calls } = facilitator.state;
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /verify", "POST /settle"]);
    const expected = { x402Version: 2, paymentPayload: payload, paymentRequirements: exactV2 };
    expect(calls[0].body).toEqual(expected);
    expect(calls[1].body).toEqual(expected);

    expect(res.headers.get(X402_HEADERS.responseV1)).toBeNull();
    expect(decodeSettlementResponse(res.headers.get(X402_HEADERS.responseV2)!)).toEqual({
      success: true,
      transaction: "5igSettled",
      network: DEVNET,
      payer: buyer,
    });
  });

  it("uses the v1 network name in the v1 requirement when configured with a CAIP-2 id", async () => {
    const body = await (await fetch(`${baseUrl}/caip2`)).json();
    expect(body.accepts[0].network).toBe(DEVNET);
    expect(body.accepts[1].network).toBe("solana-devnet");
    expect((await payV1("/caip2")).status).toBe(200);
    expect(facilitator.state.calls[0].body.paymentRequirements.network).toBe("solana-devnet");
  });

  it("verify failure is a 402 with the facilitator's reason, and nothing is settled", async () => {
    facilitator.state.verify = () =>
      Response.json({ isValid: false, invalidReason: "insufficient_funds", payer: buyer });

    for (const [pay, header, network] of [
      [payV1, X402_HEADERS.responseV1, "solana-devnet"],
      [payV2, X402_HEADERS.responseV2, DEVNET],
    ] as const) {
      facilitator.state.calls = [];
      const res = await pay("/both");
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe("insufficient_funds");
      expect(body.accepts).toHaveLength(2);
      expect(decodeX402Header<any>(res.headers.get(X402_HEADERS.requiredV2)!).error).toBe("insufficient_funds");
      expect(decodeSettlementResponse(res.headers.get(header)!)).toEqual({
        success: false,
        errorReason: "insufficient_funds",
        transaction: "",
        network,
        payer: buyer,
      });
      expect(facilitator.state.calls.map((c) => c.path)).toEqual(["/verify"]);
    }
  });

  it("reads a verdict the facilitator sends with a 4xx status", async () => {
    facilitator.state.verify = () =>
      Response.json({ isValid: false, invalidReason: "invalid_payload" }, { status: 400 });
    const res = await payV1("/both");
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("invalid_payload");
  });

  it("settle failure is a 402 with the facilitator's reason and the handler does not run", async () => {
    facilitator.state.settle = () =>
      Response.json({
        success: false,
        errorReason: "invalid_transaction_state",
        payer: buyer,
        transaction: "",
        network: DEVNET,
      });

    for (const [pay, header] of [
      [payV1, X402_HEADERS.responseV1],
      [payV2, X402_HEADERS.responseV2],
    ] as const) {
      facilitator.state.calls = [];
      const res = await pay("/both");
      expect(res.status).toBe(402);
      const body = await res.json();
      expect(body.error).toBe("invalid_transaction_state");
      expect(body.signature).toBeUndefined();
      expect(decodeSettlementResponse(res.headers.get(header)!)).toMatchObject({
        success: false,
        errorReason: "invalid_transaction_state",
        transaction: "",
      });
      expect(facilitator.state.calls.map((c) => c.path)).toEqual(["/verify", "/settle"]);
    }
  });

  it("an unreachable or unreadable facilitator is a 402, not a paid response", async () => {
    facilitator.state.verify = () => {
      throw new Error("connect ECONNREFUSED");
    };
    let res = await payV1("/both");
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("facilitator /verify failed: connect ECONNREFUSED");

    facilitator.state.verify = defaults.verify;
    facilitator.state.settle = () => new Response("<html>bad gateway</html>", { status: 502 });
    res = await payV1("/both");
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("facilitator /settle failed: HTTP 502");

    // success without a transaction signature is not a settlement
    facilitator.state.settle = () => Response.json({ success: true, transaction: "", network: DEVNET });
    res = await payV1("/both");
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("payment settlement failed");
  });

  it("refuses an exact payment for another network or altered requirements without calling the facilitator", async () => {
    let res = await payV1("/both", { ...payloadV1, network: "solana" });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("scheme or network does not match");

    for (const patch of [
      { amount: "1" },
      { payTo: buyer },
      { asset: buyer },
      { network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" },
      { extra: { feePayer: buyer } },
      { extra: undefined },
    ]) {
      res = await payV2("/both", { ...payloadV2("/both"), accepted: { ...exactV2, ...patch } });
      expect(res.status).toBe(402);
      expect((await res.json()).error).toContain("accepted requirement does not match");
    }

    res = await payV1("/both", { ...payloadV1, payload: "AQAAAA==" });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("malformed payment header");

    expect(facilitator.state.calls).toHaveLength(0);
  });

  it("on a network without a CAIP-2 id, exact is v1 only", async () => {
    const res = await fetch(`${baseUrl}/local`);
    expect(res.headers.get(X402_HEADERS.requiredV2)).toBeNull();
    expect((await res.json()).accepts[1]).toEqual(exactV1("/local", "solana-localnet"));

    expect((await payV1("/local", { ...payloadV1, network: "solana-localnet" })).status).toBe(200);
    const v2 = await payV2("/local");
    expect(v2.status).toBe(402);
    expect((await v2.json()).error).toContain("no CAIP-2 id");
  });

  it("a paywall without the option still rejects exact payments", async () => {
    const res = await payV1("/vault-only");
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("scheme or network does not match");
    expect(facilitator.state.calls).toHaveLength(0);
  });

  it("truva-vault payments on the same route never touch the facilitator", async () => {
    const vaultPayment = encodeX402Header({
      x402Version: 1,
      scheme: "truva-vault",
      network: "solana-devnet",
      payload: { transaction: "AAEC" },
    });
    const res = await fetch(`${baseUrl}/both`, { headers: { "X-PAYMENT": vaultPayment } });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("malformed payment header");
    expect(facilitator.state.calls).toHaveLength(0);
  });

  it("fetchWithVault still picks truva-vault when exact is offered too", async () => {
    const seen: string[] = [];
    const spy: typeof fetch = async (input, init) => {
      const header = new Headers(init?.headers).get(X402_HEADERS.paymentV1);
      if (header) seen.push(decodeX402Header<any>(header).scheme);
      return fetch(input, init);
    };
    const agent = Keypair.generate();
    const signing = {
      getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58() }),
    } as unknown as Connection;
    // The mocked chain has no passport lookup, so settlement is refused; what
    // matters here is which scheme the client chose to pay with.
    await fetchWithVault(`${baseUrl}/both`, undefined, {
      connection: signing,
      agent,
      vaultOwner: seller,
      fetch: spy,
    }).catch(() => undefined);
    expect(seen).toEqual(["truva-vault"]);
    expect(facilitator.state.calls).toHaveLength(0);
  });

  describe("trust-gated routes", () => {
    it("refuses to build a paywall with minTier above Bronze and exact", () => {
      for (const minTier of ["Silver", "Gold"] as const) {
        expect(() => truvaPaywall({ ...base, minTier, exact })).toThrow(/bypass Truva trust checks/);
      }
      expect(() => truvaPaywall({ ...base, minTier: "Bronze", exact })).not.toThrow();
      expect(() => truvaPaywall({ ...base, minTier: "Gold" })).not.toThrow();
    });

    it("offers exact on a gated route only with allowUngated", async () => {
      const body = await (await fetch(`${baseUrl}/gated-open`)).json();
      expect(body.accepts.map((a: any) => a.scheme)).toEqual(["truva-vault", "exact"]);
      expect(body.accepts[0].extra.minTier).toBe("Gold");
      const res = await payV1("/gated-open");
      expect(res.status).toBe(200);
      expect((await res.json()).scheme).toBe("exact");
    });

    it("rejects a malformed exact option", () => {
      expect(() => truvaPaywall({ ...base, exact: { facilitatorUrl: "" } })).toThrow(/facilitatorUrl/);
      expect(() =>
        truvaPaywall({ ...base, exact: { facilitatorUrl: FACILITATOR, feePayer: "not-a-key" } })
      ).toThrow(/feePayer/);
    });
  });
});

describe("facilitator client", () => {
  it("findExactFeePayer matches the network under its v1 name or CAIP-2 id", () => {
    expect(findExactFeePayer(supportedBody, ["solana-devnet", DEVNET])).toBe(feePayer);
    expect(findExactFeePayer(supportedBody, [DEVNET])).toBe(feePayer);
    expect(findExactFeePayer(supportedBody, ["solana", undefined])).toBeUndefined();
    expect(findExactFeePayer(supportedBody, ["base-sepolia"])).toBeUndefined();
    const other = { kinds: [{ x402Version: 2, scheme: "upto", network: DEVNET, extra: { feePayer } }] };
    expect(findExactFeePayer(other, [DEVNET])).toBeUndefined();
  });

  it("throws FacilitatorError for a body without a verdict", async () => {
    const client = createFacilitatorClient({
      facilitatorUrl: FACILITATOR,
      fetch: async () => Response.json({ error: "unauthorized" }, { status: 401 }),
    });
    const request = { x402Version: 1 as const, paymentPayload: {}, paymentRequirements: {} as any };
    await expect(client.verify(request)).rejects.toMatchObject({
      name: "FacilitatorError",
      endpoint: "verify",
      status: 401,
    });
    await expect(client.settle(request)).rejects.toBeInstanceOf(FacilitatorError);
    await expect(client.supported()).rejects.toThrow("facilitator /supported failed: HTTP 401");
  });
});
