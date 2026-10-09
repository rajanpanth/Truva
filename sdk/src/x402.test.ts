import * as http from "http";
import type { AddressInfo } from "net";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import type { Connection } from "@solana/web3.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DISCRIMINATORS } from "./instructions";
import { TRUSTGATE_PROGRAM_ID, deriveAssociatedTokenAddress } from "./pda";
import {
  PaymentRejectedError,
  SOLANA_CAIP2_NETWORKS,
  TRUVA_VAULT_SCHEME,
  X402_HEADERS,
  buildPaymentRequired,
  buildPaymentRequiredV2,
  buildPaymentRequirements,
  createVaultPayment,
  decodePaymentPayload,
  decodeSettlementResponse,
  decodeX402Header,
  encodePaymentPayload,
  encodeX402Header,
  fetchWithVault,
  fromCaip2Network,
  selectVaultRequirements,
  toCaip2Network,
  truvaPaywall,
} from "./x402";

const DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
const seller = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const owner = Keypair.generate().publicKey;

const requirements = buildPaymentRequirements({
  payTo: seller,
  mint,
  amount: 1_500_000n,
  resource: "https://api.example.com/report",
  description: "Weekly report",
  mimeType: "application/json",
  minTier: "Silver",
});

/** A stock x402 `exact` requirement, as another server might list beside ours. */
const exactV1 = {
  scheme: "exact",
  network: "solana-devnet",
  maxAmountRequired: "1000",
  asset: mint.toBase58(),
  payTo: seller.toBase58(),
  resource: "https://api.example.com/report",
  description: "",
  mimeType: "",
  maxTimeoutSeconds: 60,
  extra: { feePayer: Keypair.generate().publicKey.toBase58() },
};

describe("network identifiers", () => {
  it("maps x402 v1 Solana names to CAIP-2 ids and back", () => {
    expect(toCaip2Network("solana")).toBe("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
    expect(toCaip2Network("solana-devnet")).toBe(DEVNET);
    expect(fromCaip2Network(DEVNET)).toBe("solana-devnet");
    for (const [name, id] of Object.entries(SOLANA_CAIP2_NETWORKS)) {
      expect(fromCaip2Network(id)).toBe(name);
    }
  });

  it("passes CAIP-2 ids through and has no id for a local validator", () => {
    expect(toCaip2Network(DEVNET)).toBe(DEVNET);
    expect(toCaip2Network("solana-localnet")).toBeUndefined();
    expect(fromCaip2Network("solana:unknown")).toBeUndefined();
  });
});

describe("402 response, x402 v1 body", () => {
  it("has every field the v1 spec requires, with the truva-vault scheme", () => {
    const body = JSON.parse(JSON.stringify(buildPaymentRequired(requirements)));

    expect(body).toEqual({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [
        {
          scheme: "truva-vault",
          network: "solana-devnet",
          maxAmountRequired: "1500000",
          asset: mint.toBase58(),
          payTo: seller.toBase58(),
          resource: "https://api.example.com/report",
          description: "Weekly report",
          mimeType: "application/json",
          maxTimeoutSeconds: 60,
          extra: { programId: TRUSTGATE_PROGRAM_ID.toBase58(), minTier: "Silver" },
        },
      ],
    });
  });

  it("defaults description and mimeType to empty strings, never undefined", () => {
    const bare = buildPaymentRequirements({ payTo: seller, mint, amount: 1, resource: "https://x.test/" });
    const entry = JSON.parse(JSON.stringify(buildPaymentRequired(bare))).accepts[0];
    expect(entry.description).toBe("");
    expect(entry.mimeType).toBe("");
    expect(entry.extra.minTier).toBe("Bronze");
  });
});

describe("402 response, x402 v2 PAYMENT-REQUIRED header", () => {
  it("round-trips through base64 JSON in v2 layout with a CAIP-2 network", () => {
    const header = encodeX402Header(buildPaymentRequiredV2(requirements));
    expect(header).toMatch(/^[A-Za-z0-9+/]+=*$/);

    expect(decodeX402Header(header)).toEqual({
      x402Version: 2,
      error: "PAYMENT-SIGNATURE header is required",
      resource: {
        url: "https://api.example.com/report",
        description: "Weekly report",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: "truva-vault",
          network: DEVNET,
          amount: "1500000",
          asset: mint.toBase58(),
          payTo: seller.toBase58(),
          maxTimeoutSeconds: 60,
          extra: { programId: TRUSTGATE_PROGRAM_ID.toBase58(), minTier: "Silver" },
        },
      ],
    });
  });

  it("is not produced for a network without a CAIP-2 id", () => {
    expect(buildPaymentRequiredV2({ ...requirements, network: "solana-localnet" })).toBeNull();
  });
});

describe("selectVaultRequirements", () => {
  it("skips other schemes in a v1 body", () => {
    const picked = selectVaultRequirements({ x402Version: 1, error: "", accepts: [exactV1, requirements] });
    expect(picked).toEqual({ x402Version: 1, requirements });
  });

  it("reads a v2 header and returns the requirement in v1 layout", () => {
    const picked = selectVaultRequirements(encodeX402Header(buildPaymentRequiredV2(requirements)));
    expect(picked).toEqual({ x402Version: 2, requirements: { ...requirements, network: DEVNET } });
  });

  it("returns undefined when only other schemes are offered", () => {
    expect(selectVaultRequirements({ x402Version: 1, accepts: [exactV1] })).toBeUndefined();
  });

  it("skips malformed truva-vault entries and non-x402 input", () => {
    const bad = [
      { ...requirements, maxAmountRequired: "1.5" },
      { ...requirements, asset: "not-a-key" },
      { ...requirements, extra: {} },
      { ...requirements, extra: undefined },
      null,
      "truva-vault",
    ];
    expect(selectVaultRequirements({ x402Version: 1, accepts: bad })).toBeUndefined();
    expect(selectVaultRequirements({ x402Version: 1, accepts: [...bad, requirements] })?.requirements).toEqual(
      requirements
    );
    for (const input of [undefined, null, 42, {}, { accepts: "x" }, "%%%", encodeX402Header([1])]) {
      expect(selectVaultRequirements(input)).toBeUndefined();
    }
  });

  it("falls back to Bronze for an unknown minTier", () => {
    const odd = { ...requirements, extra: { ...requirements.extra, minTier: "Diamond" } };
    expect(selectVaultRequirements({ accepts: [odd] })?.requirements.extra.minTier).toBe("Bronze");
  });
});

describe("payment header", () => {
  it("v1: X-PAYMENT is base64 JSON { x402Version, scheme, network, payload }", () => {
    const header = encodePaymentPayload(requirements, "AAEC");
    expect(decodeX402Header(header)).toEqual({
      x402Version: 1,
      scheme: "truva-vault",
      network: "solana-devnet",
      payload: { transaction: "AAEC" },
    });
    expect(decodePaymentPayload(header)).toEqual({
      x402Version: 1,
      scheme: "truva-vault",
      network: "solana-devnet",
      transaction: "AAEC",
    });
  });

  it("v2: PAYMENT-SIGNATURE carries the accepted requirement and the resource", () => {
    const header = encodePaymentPayload(requirements, "AAEC", 2);
    const raw = decodeX402Header(header);
    expect(raw).toEqual({
      x402Version: 2,
      resource: {
        url: "https://api.example.com/report",
        description: "Weekly report",
        mimeType: "application/json",
      },
      accepted: buildPaymentRequiredV2(requirements)!.accepts[0],
      payload: { transaction: "AAEC" },
    });

    const decoded = decodePaymentPayload(header);
    expect(decoded).toMatchObject({
      x402Version: 2,
      scheme: "truva-vault",
      network: DEVNET,
      transaction: "AAEC",
    });
    expect(decoded.accepted).toEqual(raw.accepted);
  });

  it("v2 encoding refuses a network without a CAIP-2 id", () => {
    expect(() => encodePaymentPayload({ ...requirements, network: "solana-localnet" }, "AAEC", 2)).toThrow(
      /CAIP-2/
    );
  });

  it("rejects malformed headers", () => {
    const bad = [
      "",
      "not base64 json",
      encodeX402Header("string"),
      encodeX402Header({ x402Version: 1, scheme: "truva-vault", network: "solana-devnet" }),
      encodeX402Header({ x402Version: 1, scheme: "truva-vault", network: "solana-devnet", payload: {} }),
      encodeX402Header({ x402Version: 1, network: "solana-devnet", payload: { transaction: "AA" } }),
      encodeX402Header({ x402Version: 2, payload: { transaction: "AA" } }),
      encodeX402Header({ x402Version: 2, accepted: { scheme: "truva-vault" }, payload: { transaction: "AA" } }),
    ];
    for (const header of bad) {
      expect(() => decodePaymentPayload(header), header).toThrow(PaymentRejectedError);
    }
  });

  it("createVaultPayment signs a vault_pay transaction for the required amount", async () => {
    const agent = Keypair.generate();
    const connection = {
      getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58() }),
    } as unknown as Connection;

    for (const x402Version of [1, 2] as const) {
      const header = await createVaultPayment({
        connection,
        agent,
        vaultOwner: owner,
        requirements,
        x402Version,
      });
      const decoded = decodePaymentPayload(header);
      expect(decoded.x402Version).toBe(x402Version);

      const tx = Transaction.from(Buffer.from(decoded.transaction, "base64"));
      expect(tx.verifySignatures()).toBe(true);
      expect(tx.feePayer!.equals(agent.publicKey)).toBe(true);
      expect(tx.instructions).toHaveLength(1);
      const ix = tx.instructions[0];
      expect(ix.programId.equals(TRUSTGATE_PROGRAM_ID)).toBe(true);
      expect([...ix.data.subarray(0, 8)]).toEqual([...DISCRIMINATORS.vault_pay]);
      expect(ix.data.readBigUInt64LE(8)).toBe(1_500_000n);
      expect(ix.keys[4].pubkey.equals(deriveAssociatedTokenAddress(mint, seller))).toBe(true);
    }
  });
});

// ── Paywall over real HTTP, with the chain mocked ────────────────────────────

/** AgentPassport account bytes: Silver, score 60, not frozen. */
function passportAccount(agent: PublicKey, tier = 1) {
  const data = Buffer.alloc(8 + 32 + 32 + 1 + 1 + 8 + 8 + 1 + 8 + 8 + 1);
  agent.toBuffer().copy(data, 8);
  data[72] = 60;
  data[73] = tier;
  return { data };
}

describe("truvaPaywall and fetchWithVault", () => {
  const agent = Keypair.generate();
  const submitted: Buffer[] = [];
  const connection = {
    getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58() }),
    // [passport, protocol config]; no config account means the passport is trusted
    getMultipleAccountsInfo: async () => [passportAccount(agent.publicKey), null],
    sendRawTransaction: async (raw: Buffer) => {
      submitted.push(Buffer.from(raw));
      return `sig${submitted.length}`;
    },
    confirmTransaction: async () => ({ value: { err: null } }),
  } as unknown as Connection;

  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const routes: Record<string, ReturnType<typeof truvaPaywall>> = {
      "/report": truvaPaywall({ connection, payTo: seller, mint, amount: 1_500_000 }),
      "/gold": truvaPaywall({ connection, payTo: seller, mint, amount: 1_500_000, minTier: "Gold" }),
      "/local": truvaPaywall({ connection, payTo: seller, mint, amount: 1, network: "solana-localnet" }),
      "/other-program": truvaPaywall({ connection, payTo: seller, mint, amount: 1, programId: owner }),
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
        res.end(JSON.stringify({ paidBy: (req as any).truvaPayment.payer }));
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

  const vaultOpts = { connection, agent, vaultOwner: owner };

  it("answers 402 with a v1 body and a matching v2 PAYMENT-REQUIRED header", async () => {
    const res = await fetch(`${baseUrl}/report`);
    expect(res.status).toBe(402);
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = await res.json();
    expect(body.x402Version).toBe(1);
    expect(typeof body.error).toBe("string");
    expect(body.accepts).toHaveLength(1);
    const entry = body.accepts[0];
    expect(entry).toMatchObject({
      scheme: TRUVA_VAULT_SCHEME,
      network: "solana-devnet",
      maxAmountRequired: "1500000",
      resource: `${baseUrl}/report`,
      description: "",
      mimeType: "",
      maxTimeoutSeconds: 60,
    });
    expect(() => new URL(entry.resource)).not.toThrow();

    const v2 = decodeX402Header<any>(res.headers.get(X402_HEADERS.requiredV2)!);
    expect(v2.x402Version).toBe(2);
    expect(v2.resource).toEqual({ url: `${baseUrl}/report` });
    expect(v2.accepts).toEqual([
      {
        scheme: TRUVA_VAULT_SCHEME,
        network: DEVNET,
        amount: "1500000",
        asset: entry.asset,
        payTo: entry.payTo,
        maxTimeoutSeconds: 60,
        extra: entry.extra,
      },
    ]);
  });

  it("omits the v2 header on a network without a CAIP-2 id", async () => {
    const res = await fetch(`${baseUrl}/local`);
    expect(res.status).toBe(402);
    expect(res.headers.get(X402_HEADERS.requiredV2)).toBeNull();
    expect((await res.json()).accepts[0].network).toBe("solana-localnet");
  });

  it("v1 round trip: X-PAYMENT in, X-PAYMENT-RESPONSE out", async () => {
    const before = submitted.length;
    const res = await fetchWithVault(`${baseUrl}/report`, undefined, vaultOpts);
    expect(res.status).toBe(200);
    expect((await res.json()).paidBy).toBe(agent.publicKey.toBase58());
    expect(submitted).toHaveLength(before + 1);
    expect(res.headers.get(X402_HEADERS.responseV2)).toBeNull();

    const receipt = decodeSettlementResponse(res.headers.get(X402_HEADERS.responseV1)!);
    expect(receipt).toEqual({
      success: true,
      transaction: `sig${before + 1}`,
      network: "solana-devnet",
      payer: agent.publicKey.toBase58(),
      amount: "1500000",
      signature: `sig${before + 1}`,
    });
  });

  it("v2 round trip: PAYMENT-SIGNATURE in, PAYMENT-RESPONSE out", async () => {
    const challenge = await fetch(`${baseUrl}/report`);
    const picked = selectVaultRequirements(challenge.headers.get(X402_HEADERS.requiredV2)!)!;
    expect(picked.x402Version).toBe(2);
    const payment = await createVaultPayment({ ...vaultOpts, ...picked });

    const res = await fetch(`${baseUrl}/report`, { headers: { [X402_HEADERS.paymentV2]: payment } });
    expect(res.status).toBe(200);
    expect(res.headers.get(X402_HEADERS.responseV1)).toBeNull();
    const receipt = decodeSettlementResponse(res.headers.get(X402_HEADERS.responseV2)!);
    expect(receipt).toMatchObject({ success: true, network: DEVNET, payer: agent.publicKey.toBase58() });
    expect(receipt.transaction).toBe(receipt.signature);
  });

  it("fetchWithVault pays a v2-only server through the header", async () => {
    const seen: Record<string, string | null> = {};
    const v2Only: typeof fetch = async (input, init) => {
      const res = await fetch(input, init);
      const headers = new Headers(init?.headers);
      seen.v1 = headers.get(X402_HEADERS.paymentV1);
      seen.v2 = headers.get(X402_HEADERS.paymentV2);
      // The v2 transport carries nothing in the 402 body
      return res.status === 402 ? new Response("{}", { status: 402, headers: res.headers }) : res;
    };
    const res = await fetchWithVault(`${baseUrl}/report`, { headers: { "X-Trace": "1" } }, {
      ...vaultOpts,
      fetch: v2Only,
    });
    expect(res.status).toBe(200);
    expect(seen.v1).toBeNull();
    expect(decodePaymentPayload(seen.v2!).x402Version).toBe(2);
  });

  it("ignores an exact-scheme entry listed before truva-vault", async () => {
    const mixed: typeof fetch = async (input, init) => {
      const res = await fetch(input, init);
      if (res.status !== 402) return res;
      const body = await res.json();
      return new Response(JSON.stringify({ ...body, accepts: [exactV1, ...body.accepts] }), { status: 402 });
    };
    const res = await fetchWithVault(`${baseUrl}/report`, undefined, { ...vaultOpts, fetch: mixed });
    expect(res.status).toBe(200);
  });

  it("refuses a server that only offers other schemes, without signing", async () => {
    const before = submitted.length;
    const exactOnly: typeof fetch = async () =>
      new Response(JSON.stringify({ x402Version: 1, error: "", accepts: [exactV1] }), { status: 402 });
    await expect(
      fetchWithVault(`${baseUrl}/report`, undefined, { ...vaultOpts, fetch: exactOnly })
    ).rejects.toThrow("does not accept truva-vault");
    expect(submitted).toHaveLength(before);
  });

  it("refuses to sign for a program the agent did not expect", async () => {
    await expect(fetchWithVault(`${baseUrl}/other-program`, undefined, vaultOpts)).rejects.toThrow(
      "payment through program"
    );
    const res = await fetchWithVault(`${baseUrl}/other-program`, undefined, { ...vaultOpts, programId: owner });
    expect(res.status).toBe(200);
  });

  it("buyer guards: maxAmount and mint", async () => {
    await expect(
      fetchWithVault(`${baseUrl}/report`, undefined, { ...vaultOpts, maxAmount: 1 })
    ).rejects.toThrow("above the agent's maximum");
    await expect(
      fetchWithVault(`${baseUrl}/report`, undefined, { ...vaultOpts, mint: owner })
    ).rejects.toThrow("server asks for token");
  });

  it("a refused payment is a 402 with the reason in the body and a failed receipt", async () => {
    await expect(fetchWithVault(`${baseUrl}/gold`, undefined, vaultOpts)).rejects.toMatchObject({
      reason: expect.stringContaining("InsufficientTrustTier"),
    });

    const underpaid = await createVaultPayment({
      ...vaultOpts,
      requirements: { ...requirements, maxAmountRequired: "1" },
    });
    const res = await fetch(`${baseUrl}/report`, { headers: { "X-PAYMENT": underpaid } });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toContain("below the price");
    expect(body.accepts).toHaveLength(1);
    expect(decodeSettlementResponse(res.headers.get(X402_HEADERS.responseV1)!)).toEqual({
      success: false,
      errorReason: body.error,
      transaction: "",
      network: "solana-devnet",
    });
  });

  it("rejects a payment for another network or scheme", async () => {
    for (const patch of [{ network: "solana" }, { network: "eip155:8453" }]) {
      const payment = await createVaultPayment({ ...vaultOpts, requirements: { ...requirements, ...patch } });
      const res = await fetch(`${baseUrl}/report`, { headers: { "X-PAYMENT": payment } });
      expect(res.status).toBe(402);
      expect((await res.json()).error).toBe("scheme or network does not match");
    }
    const exact = encodeX402Header({
      x402Version: 1,
      scheme: "exact",
      network: "solana-devnet",
      payload: { transaction: "AAEC" },
    });
    const res = await fetch(`${baseUrl}/report`, { headers: { "X-PAYMENT": exact } });
    expect(res.status).toBe(402);
    expect((await res.json()).error).toBe("scheme or network does not match");
  });
});
