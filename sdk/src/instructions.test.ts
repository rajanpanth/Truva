import { createHash } from "crypto";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import {
  DISCRIMINATORS,
  MAX_ALLOWLIST,
  createVaultIx,
  parseVaultAccount,
  setMerchantPolicyIx,
  vaultPayIx,
  verifyTrustIx,
} from "./instructions";
import {
  deriveAssociatedTokenAddress,
  deriveConfigPDA,
  deriveMerchantPolicyPDA,
  derivePassportPDA,
  deriveVaultPDA,
} from "./pda";

describe("instruction discriminators", () => {
  it("match Anchor's sha256(\"global:<name>\") rule", () => {
    for (const [name, bytes] of Object.entries(DISCRIMINATORS)) {
      const expected = [...createHash("sha256").update(`global:${name}`).digest().subarray(0, 8)];
      expect([...bytes], name).toEqual(expected);
    }
  });
});

describe("instruction builders", () => {
  const owner = Keypair.generate().publicKey;
  const agent = Keypair.generate().publicKey;
  const mint = Keypair.generate().publicKey;
  const shop = Keypair.generate().publicKey;

  it("vaultPayIx lays out accounts in program order with the agent as only signer", () => {
    const ix = vaultPayIx(owner, agent, mint, shop, 1_500_000n);
    const [vault] = deriveVaultPDA(owner, agent, mint);

    expect(ix.keys.map((k) => k.pubkey.toBase58())).toEqual(
      [
        deriveConfigPDA()[0],
        derivePassportPDA(agent)[0],
        vault,
        deriveAssociatedTokenAddress(mint, vault),
        deriveAssociatedTokenAddress(mint, shop),
        deriveMerchantPolicyPDA(shop)[0],
        mint,
        agent,
        ix.keys[8].pubkey,
      ].map((k) => k.toBase58())
    );
    expect(ix.keys.filter((k) => k.isSigner).map((k) => k.pubkey.toBase58())).toEqual([
      agent.toBase58(),
    ]);
    expect(ix.data.readBigUInt64LE(8)).toBe(1_500_000n);
  });

  it("createVaultIx encodes limits and allowlist", () => {
    const ix = createVaultIx(owner, agent, mint, {
      perTxLimit: 10n,
      dailyLimit: 25n,
      allowlist: [shop],
    });
    expect(ix.data.readBigUInt64LE(8)).toBe(10n);
    expect(ix.data.readBigUInt64LE(16)).toBe(25n);
    expect(ix.data.readUInt32LE(24)).toBe(1);
    expect(ix.data.subarray(28, 60).equals(shop.toBuffer())).toBe(true);
    expect(ix.keys[7].pubkey.equals(SystemProgram.programId)).toBe(true);
  });

  it("rejects invalid vault policies before sending", () => {
    expect(() =>
      createVaultIx(owner, agent, mint, { perTxLimit: 30, dailyLimit: 25 })
    ).toThrow(/daily limit/);
    expect(() =>
      createVaultIx(owner, agent, mint, {
        perTxLimit: 1,
        dailyLimit: 2,
        allowlist: Array.from({ length: MAX_ALLOWLIST + 1 }, () => Keypair.generate().publicKey),
      })
    ).toThrow(/at most/);
  });

  it("encodes tiers as their rank", () => {
    expect(verifyTrustIx(agent, "Gold").data[8]).toBe(2);
    expect(setMerchantPolicyIx(shop, "Silver").data[8]).toBe(1);
  });
});

describe("parseVaultAccount", () => {
  it("reads limits, window, pause flag and only the used allowlist entries", () => {
    const owner = Keypair.generate().publicKey;
    const agent = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    const allowed = Keypair.generate().publicKey;

    const data = Buffer.alloc(8 + 96 + 40 + 2 + 32 * MAX_ALLOWLIST + 1);
    let o = 8;
    for (const k of [owner, agent, mint]) { k.toBuffer().copy(data, o); o += 32; }
    data.writeBigUInt64LE(10n, o); o += 8;
    data.writeBigUInt64LE(25n, o); o += 8;
    data.writeBigUInt64LE(7n, o); o += 8;
    data.writeBigInt64LE(1_700_000_000n, o); o += 8;
    data.writeBigUInt64LE(42n, o); o += 8;
    data[o++] = 1; // paused
    data[o++] = 1; // allowlist_len
    allowed.toBuffer().copy(data, o);

    const vault = parseVaultAccount(data);
    expect(vault.owner.equals(owner)).toBe(true);
    expect(vault.agent.equals(agent)).toBe(true);
    expect(vault.mint.equals(mint)).toBe(true);
    expect(vault.perTxLimit).toBe(10n);
    expect(vault.dailyLimit).toBe(25n);
    expect(vault.spentInWindow).toBe(7n);
    expect(vault.windowStart).toBe(1_700_000_000);
    expect(vault.totalSpent).toBe(42n);
    expect(vault.paused).toBe(true);
    expect(vault.allowlist.map((k) => k.toBase58())).toEqual([allowed.toBase58()]);
  });
});
