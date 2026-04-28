/**
 * Integration tests for the Helius webhook handler.
 *
 * Uses supertest + mocked DB/scorer — no real Postgres/Helius needed.
 *
 * Run: cd backend/reputation-engine && npx ts-mocha -p tsconfig.json src/__tests__/webhook.test.ts
 */

import assert from "node:assert/strict";
import { describe, it, mock, beforeEach } from "node:test";
import express from "express";

// ── Mock DB and scorer before loading the webhook router ──
// We use node:test mock to intercept module-level imports.

const mockQuery = mock.fn(async (_sql: string, _params?: unknown[]) => ({
  rows: [{ pubkey: "5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo" }],
  rowCount: 1,
}));

const mockRecalculate = mock.fn(async (_pubkey: string) => undefined);

// Patch require cache before loading helius.ts
// (Works for CommonJS; for ESM use vitest with vi.mock)
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request.includes("db/client")) {
    return { query: mockQuery, pool: { connect: mock.fn() } };
  }
  if (request.includes("services/scorer")) {
    return { recalculateScore: mockRecalculate };
  }
  return originalLoad.apply(this, [request, parent, isMain]);
};

// Dynamically load the webhook router after mocks are in place
// eslint-disable-next-line @typescript-eslint/no-var-requires
const heliusRouter = require("../webhooks/helius").default;

// Build a minimal Express app for testing
function buildApp(webhookSecret?: string) {
  if (webhookSecret) {
    process.env.HELIUS_WEBHOOK_SECRET = webhookSecret;
  } else {
    delete process.env.HELIUS_WEBHOOK_SECRET;
  }
  const app = express();
  app.use(express.json());
  app.use("/webhook", heliusRouter);
  return app;
}

// ── Helpers ──

/** A realistic mock Helius webhook transaction payload */
function mockHeliusTx(overrides: Record<string, unknown> = {}) {
  return {
    signature: "5NfxWcXqSBNb5pTDhQXiwKuLsNVxLbpzV7sAv9TzFXKyTest" + Math.random(),
    timestamp: Math.floor(Date.now() / 1000),
    transactionError: null,
    meta: { err: null },
    accountData: [
      { account: "5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo" },
      { account: "RecipientXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
    ],
    nativeTransfers: [{ amount: 1_000_000_000 }],
    ...overrides,
  };
}

async function post(app: express.Application, path: string, body: unknown, headers: Record<string, string> = {}) {
  // Use supertest-style manual HTTP call via node:http
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as { port: number };
      const payload = JSON.stringify(body);
      const http = require("node:http") as typeof import("node:http");
      const req = http.request(
        { hostname: "127.0.0.1", port, path, method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers } },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close();
            resolve({ status: res.statusCode!, body: JSON.parse(data) });
          });
        }
      );
      req.write(payload);
      req.end();
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("POST /webhook/helius", () => {
  beforeEach(() => {
    mockQuery.mock.resetCalls();
    mockRecalculate.mock.resetCalls();
  });

  it("returns 200 and received count for valid array payload", async () => {
    const app = buildApp();
    const txs = [mockHeliusTx(), mockHeliusTx()];
    const { status, body } = await post(app, "/webhook/helius", txs);
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.received, 2);
  });

  it("accepts a single transaction object (not wrapped in array)", async () => {
    const app = buildApp();
    const { status, body } = await post(app, "/webhook/helius", mockHeliusTx());
    assert.equal(status, 200);
    assert.equal(body.received, 1);
  });

  it("returns 401 when signature is invalid (secret is set)", async () => {
    const app = buildApp("test-secret");
    const { status, body } = await post(app, "/webhook/helius", [mockHeliusTx()], {
      "x-helius-signature": "invalidsig",
    });
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("skips transactions with no accountData", async () => {
    const app = buildApp();
    const tx = { ...mockHeliusTx(), accountData: [] };
    const { status } = await post(app, "/webhook/helius", [tx]);
    assert.equal(status, 200);
    // recalculate should NOT have been called (no valid agent pubkey)
    assert.equal(mockRecalculate.mock.callCount(), 0);
  });

  it("handles empty array gracefully", async () => {
    const app = buildApp();
    const { status, body } = await post(app, "/webhook/helius", []);
    assert.equal(status, 200);
    assert.equal(body.received, 0);
  });
});
