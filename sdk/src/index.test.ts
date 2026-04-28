import { describe, it, expect, vi } from "vitest";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  TRUSTGATE_PROGRAM_ID,
  TruvaError,
  TruvaClient,
  AgentWallet,
  TIER_RANK,
  TIER_LIMITS_LAMPORTS,
  derivePassportPDA,
} from "./index";

// ─────────────────────────────────────────────────────────────
// TRUSTGATE_PROGRAM_ID
// ─────────────────────────────────────────────────────────────
describe("TRUSTGATE_PROGRAM_ID", () => {
  it("is a valid Solana public key", () => {
    expect(TRUSTGATE_PROGRAM_ID).toBeInstanceOf(PublicKey);
  });

  it("matches the expected devnet program address", () => {
    expect(TRUSTGATE_PROGRAM_ID.toBase58()).toBe(
      "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5"
    );
  });
});

// ─────────────────────────────────────────────────────────────
// TIER_RANK
// ─────────────────────────────────────────────────────────────
describe("TIER_RANK", () => {
  it("Bronze < Silver < Gold < Platinum", () => {
    expect(TIER_RANK.Bronze).toBeLessThan(TIER_RANK.Silver);
    expect(TIER_RANK.Silver).toBeLessThan(TIER_RANK.Gold);
    expect(TIER_RANK.Gold).toBeLessThan(TIER_RANK.Platinum);
  });
});

// ─────────────────────────────────────────────────────────────
// TIER_LIMITS_LAMPORTS (Problem 6 — units are lamports, not USD)
// ─────────────────────────────────────────────────────────────
describe("TIER_LIMITS_LAMPORTS", () => {
  it("Bronze limit is 5 SOL in lamports (5_000_000_000)", () => {
    expect(TIER_LIMITS_LAMPORTS.Bronze).toBe(5_000_000_000);
  });

  it("Silver limit is 100 SOL in lamports (100_000_000_000)", () => {
    expect(TIER_LIMITS_LAMPORTS.Silver).toBe(100_000_000_000);
  });

  it("Gold and Platinum are unlimited (MAX_SAFE_INTEGER)", () => {
    expect(TIER_LIMITS_LAMPORTS.Gold).toBe(Number.MAX_SAFE_INTEGER);
    expect(TIER_LIMITS_LAMPORTS.Platinum).toBe(Number.MAX_SAFE_INTEGER);
  });
});

// ─────────────────────────────────────────────────────────────
// TruvaError
// ─────────────────────────────────────────────────────────────
describe("TruvaError", () => {
  it("is an instance of Error", () => {
    const err = new TruvaError("msg", "Bronze", "Gold");
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of TruvaError via instanceof", () => {
    const err = new TruvaError("msg", "Bronze", "Gold");
    expect(err).toBeInstanceOf(TruvaError);
  });

  it("sets name to TruvaError", () => {
    const err = new TruvaError("msg", "Bronze", "Gold");
    expect(err.name).toBe("TruvaError");
  });

  it("stores currentTier and requiredTier", () => {
    const err = new TruvaError("Insufficient trust", "Silver", "Gold");
    expect(err.currentTier).toBe("Silver");
    expect(err.requiredTier).toBe("Gold");
  });

  it("stores message", () => {
    const err = new TruvaError("Agent is frozen", "Bronze", "Silver");
    expect(err.message).toBe("Agent is frozen");
  });

  it("can be caught as TruvaError in a try/catch", () => {
    let caught: unknown;
    try { throw new TruvaError("test", "Bronze", "Gold"); } catch (e) { caught = e; }
    expect(caught).toBeInstanceOf(TruvaError);
  });
});

// ─────────────────────────────────────────────────────────────
// derivePassportPDA
// ─────────────────────────────────────────────────────────────
describe("derivePassportPDA", () => {
  const agentKey = new PublicKey("5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo");

  it("returns a [PublicKey, number] tuple", () => {
    const [pda, bump] = derivePassportPDA(agentKey);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(typeof bump).toBe("number");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("is deterministic — same inputs → same PDA", () => {
    const [pda1] = derivePassportPDA(agentKey);
    const [pda2] = derivePassportPDA(agentKey);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("produces different PDAs for different agents", () => {
    const agent2 = new PublicKey("11111111111111111111111111111111");
    const [pda1] = derivePassportPDA(agentKey);
    const [pda2] = derivePassportPDA(agent2);
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("accepts a custom programId override", () => {
    const customProgram = new PublicKey("11111111111111111111111111111111");
    const [pdaDefault] = derivePassportPDA(agentKey);
    const [pdaCustom] = derivePassportPDA(agentKey, customProgram);
    expect(pdaDefault.toBase58()).not.toBe(pdaCustom.toBase58());
  });

  it("uses 'passport' seed (manual verification)", () => {
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("passport"), agentKey.toBuffer()],
      TRUSTGATE_PROGRAM_ID
    );
    const [actual] = derivePassportPDA(agentKey);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });
});

// ─────────────────────────────────────────────────────────────
// TruvaClient constructor (Problem 11 — config-object pattern)
// ─────────────────────────────────────────────────────────────
describe("TruvaClient constructor", () => {
  const connection = new Connection("https://api.devnet.solana.com");

  it("accepts connection with no config (all defaults)", () => {
    const client = new TruvaClient(connection);
    expect(client).toBeInstanceOf(TruvaClient);
  });

  it("accepts partial config object", () => {
    const client = new TruvaClient(connection, { apiUrl: "http://localhost:4000" });
    expect(client).toBeInstanceOf(TruvaClient);
  });

  it("accepts full config object", () => {
    const client = new TruvaClient(connection, {
      apiUrl: "https://api.example.com",
      commitment: "finalized",
    });
    expect(client).toBeInstanceOf(TruvaClient);
  });

  it("wallet is optional in config", () => {
    const client = new TruvaClient(connection, { apiUrl: "http://localhost:3001" });
    expect(client.wallet).toBeUndefined();
  });

  it("exposes wallet when provided", () => {
    const agentWallet = AgentWallet.generate();
    const client = new TruvaClient(connection, { wallet: agentWallet.walletAdapter });
    expect(client.wallet).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// AgentWallet (Problem 10)
// ─────────────────────────────────────────────────────────────
describe("AgentWallet", () => {
  it("generate() produces a new wallet with a publicKey", () => {
    const w = AgentWallet.generate();
    expect(w.publicKey).toBeInstanceOf(PublicKey);
  });

  it("fromSecretKey() round-trips with keypair.secretKey", () => {
    const w1 = AgentWallet.generate();
    const w2 = AgentWallet.fromSecretKey(w1.keypair.secretKey);
    expect(w2.publicKey.toBase58()).toBe(w1.publicKey.toBase58());
  });

  it("walletAdapter has required signing methods", () => {
    const w = AgentWallet.generate();
    expect(typeof w.walletAdapter.signTransaction).toBe("function");
    expect(typeof w.walletAdapter.signAllTransactions).toBe("function");
    expect(w.walletAdapter.publicKey).toBeInstanceOf(PublicKey);
  });

  it("createClient() returns a TruvaClient", () => {
    const w = AgentWallet.generate();
    const connection = new Connection("https://api.devnet.solana.com");
    const client = w.createClient(connection);
    expect(client).toBeInstanceOf(TruvaClient);
  });

  it("two generate() calls produce different public keys", () => {
    const w1 = AgentWallet.generate();
    const w2 = AgentWallet.generate();
    expect(w1.publicKey.toBase58()).not.toBe(w2.publicKey.toBase58());
  });
});

// ─────────────────────────────────────────────────────────────
// TruvaClient.requireTrustTier (unit-tested with mocked getAgentScore)
// ─────────────────────────────────────────────────────────────
describe("TruvaClient.requireTrustTier", () => {
  const connection = new Connection("https://api.devnet.solana.com");
  const agentKey = new PublicKey("5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo");

  it("resolves when agent tier meets requirement", async () => {
    const client = new TruvaClient(connection);
    vi.spyOn(client, "getAgentScore").mockResolvedValue({
      score: 85,
      tier: "Gold",
      txCount: 10,
      successRate: 0.9,
      frozen: false,
    });
    await expect(client.requireTrustTier("Silver", agentKey)).resolves.toBeUndefined();
  });

  it("throws TruvaError when tier is insufficient", async () => {
    const client = new TruvaClient(connection);
    vi.spyOn(client, "getAgentScore").mockResolvedValue({
      score: 20,
      tier: "Bronze",
      txCount: 2,
      successRate: 0.5,
      frozen: false,
    });
    await expect(client.requireTrustTier("Gold", agentKey)).rejects.toBeInstanceOf(TruvaError);
  });

  it("throws TruvaError when passport is frozen", async () => {
    const client = new TruvaClient(connection);
    vi.spyOn(client, "getAgentScore").mockResolvedValue({
      score: 90,
      tier: "Platinum",
      txCount: 100,
      successRate: 0.99,
      frozen: true,
    });
    const err = await client.requireTrustTier("Bronze", agentKey).catch((e) => e);
    expect(err).toBeInstanceOf(TruvaError);
    expect(err.message).toContain("frozen");
  });
});

// ─────────────────────────────────────────────────────────────
// TRUSTGATE_PROGRAM_ID
// ─────────────────────────────────────────────────────────────
describe("TRUSTGATE_PROGRAM_ID", () => {
  it("is a valid Solana public key", () => {
    expect(TRUSTGATE_PROGRAM_ID).toBeInstanceOf(PublicKey);
  });

  it("matches the expected devnet program address", () => {
    expect(TRUSTGATE_PROGRAM_ID.toBase58()).toBe(
      "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5"
    );
  });
});

// ─────────────────────────────────────────────────────────────
// TruvaError
// ─────────────────────────────────────────────────────────────
describe("TruvaError", () => {
  it("is an instance of Error", () => {
    const err = new TruvaError("msg", "Bronze", "Gold");
    expect(err).toBeInstanceOf(Error);
  });

  it("sets name to TruvaError", () => {
    const err = new TruvaError("msg", "Bronze", "Gold");
    expect(err.name).toBe("TruvaError");
  });

  it("stores currentTier and requiredTier", () => {
    const err = new TruvaError("Insufficient trust", "Silver", "Gold");
    expect(err.currentTier).toBe("Silver");
    expect(err.requiredTier).toBe("Gold");
  });

  it("stores message", () => {
    const err = new TruvaError("Agent is frozen", "Bronze", "Silver");
    expect(err.message).toBe("Agent is frozen");
  });
});

// ─────────────────────────────────────────────────────────────
// derivePassportPDA
// ─────────────────────────────────────────────────────────────
describe("derivePassportPDA", () => {
  const agentKey = new PublicKey("5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo");

  it("returns a [PublicKey, number] tuple", () => {
    const [pda, bump] = derivePassportPDA(agentKey);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(typeof bump).toBe("number");
    expect(bump).toBeGreaterThanOrEqual(0);
    expect(bump).toBeLessThanOrEqual(255);
  });

  it("is deterministic — same inputs → same PDA", () => {
    const [pda1] = derivePassportPDA(agentKey);
    const [pda2] = derivePassportPDA(agentKey);
    expect(pda1.toBase58()).toBe(pda2.toBase58());
  });

  it("produces different PDAs for different agents", () => {
    const agent2 = new PublicKey("11111111111111111111111111111111");
    const [pda1] = derivePassportPDA(agentKey);
    const [pda2] = derivePassportPDA(agent2);
    expect(pda1.toBase58()).not.toBe(pda2.toBase58());
  });

  it("accepts a custom programId override", () => {
    const customProgram = new PublicKey("11111111111111111111111111111111");
    const [pdaDefault] = derivePassportPDA(agentKey);
    const [pdaCustom] = derivePassportPDA(agentKey, customProgram);
    expect(pdaDefault.toBase58()).not.toBe(pdaCustom.toBase58());
  });

  it("uses 'passport' seed", () => {
    // Verify via manual derivation
    const [expected] = PublicKey.findProgramAddressSync(
      [Buffer.from("passport"), agentKey.toBuffer()],
      TRUSTGATE_PROGRAM_ID
    );
    const [actual] = derivePassportPDA(agentKey);
    expect(actual.toBase58()).toBe(expected.toBase58());
  });
});
