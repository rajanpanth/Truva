import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/spl-token";
import { expect } from "chai";
import * as http from "http";
import { AddressInfo } from "net";
import {
  PaymentRejectedError,
  TruvaClient,
  buildPaymentRequirements,
  createVaultIx,
  createVaultPayment,
  deriveAssociatedTokenAddress,
  deriveVaultPDA,
  fetchWithVault,
  initializePassportIx,
  setVaultPausedIx,
  truvaPaywall,
  updateVaultPolicyIx,
} from "../sdk/src";

const BPF_LOADER_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

/**
 * End-to-end HTTP 402 flow: a paywalled server, an agent paying from its
 * vault through the SDK, and the program enforcing every limit at settlement.
 */
describe("x402 vault paywall", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const UNIT = 1_000_000; // 6 decimals
  const PRICE = 2 * UNIT;

  let program: Program;
  let admin: Keypair;
  let scorer: Keypair;
  let owner: Keypair;
  let agent: Keypair;
  let seller: Keypair;
  let mint: PublicKey;
  let sellerToken: PublicKey;
  let vaultToken: PublicKey;
  let configPda: PublicKey;

  let server: http.Server;
  let baseUrl: string;

  const balance = async (token: PublicKey) =>
    Number((await getAccount(connection, token)).amount);

  async function airdrop(to: PublicKey, sol = 1) {
    const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
  }

  async function setScore(score: number, tier: object) {
    const [passport] = PublicKey.findProgramAddressSync(
      [Buffer.from("passport"), agent.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .updateTrustTier(score, tier)
      .accounts({ passport, authority: scorer.publicKey })
      .signers([scorer])
      .rpc();
  }

  async function expectRejected(promise: Promise<unknown>, reason: string) {
    try {
      await promise;
    } catch (err: any) {
      expect(err).to.be.instanceOf(PaymentRejectedError);
      expect(err.reason).to.include(reason);
      return;
    }
    expect.fail(`Should have been rejected with ${reason}`);
  }

  const pay = (path: string, extra: object = {}) =>
    fetchWithVault(`${baseUrl}${path}`, undefined, {
      connection,
      agent,
      vaultOwner: owner.publicKey,
      ...extra,
    });

  before(async () => {
    program = anchor.workspace.Trustgate as Program;
    admin = (provider.wallet as anchor.Wallet).payer;
    scorer = Keypair.generate();
    owner = Keypair.generate();
    agent = Keypair.generate();
    seller = Keypair.generate();
    await Promise.all([
      airdrop(scorer.publicKey),
      airdrop(owner.publicKey, 2),
      airdrop(agent.publicKey),
    ]);

    // Point the protocol config at this suite's scorer
    [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    if (await connection.getAccountInfo(configPda)) {
      await program.methods
        .updateConfig(null, scorer.publicKey)
        .accounts({ config: configPda, admin: admin.publicKey })
        .rpc();
    } else {
      const [programData] = PublicKey.findProgramAddressSync(
        [program.programId.toBuffer()],
        BPF_LOADER_UPGRADEABLE
      );
      await program.methods
        .initializeConfig(scorer.publicKey)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          program: program.programId,
          programData,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    mint = await createMint(connection, admin, admin.publicKey, null, 6);
    const ownerToken = (
      await getOrCreateAssociatedTokenAccount(connection, admin, mint, owner.publicKey)
    ).address;
    sellerToken = (
      await getOrCreateAssociatedTokenAccount(connection, admin, mint, seller.publicKey)
    ).address;
    await mintTo(connection, admin, mint, ownerToken, admin, 100 * UNIT);

    // Passport (paid by the agent itself), scored Silver by the scorer
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(initializePassportIx(agent.publicKey, agent.publicKey)),
      [agent]
    );
    await setScore(60, { silver: {} });

    // Vault: 5 per payment, 5 per day, seller only
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        createVaultIx(owner.publicKey, agent.publicKey, mint, {
          perTxLimit: 5 * UNIT,
          dailyLimit: 5 * UNIT,
          allowlist: [seller.publicKey],
        })
      ),
      [owner]
    );
    const [vault] = deriveVaultPDA(owner.publicKey, agent.publicKey, mint);
    vaultToken = deriveAssociatedTokenAddress(mint, vault);
    await transfer(connection, owner, ownerToken, vaultToken, owner, 50 * UNIT);

    // Paywalled API: /report costs 2 tokens, /premium costs 2 tokens and needs Gold
    const paywall = (minTier: "Bronze" | "Gold") =>
      truvaPaywall({
        connection,
        payTo: seller.publicKey,
        mint,
        amount: PRICE,
        minTier,
        network: "solana-localnet",
      });
    const routes: Record<string, ReturnType<typeof truvaPaywall>> = {
      "/report": paywall("Bronze"),
      "/premium": paywall("Gold"),
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
        res.end(JSON.stringify({ data: "paid content", paidBy: (req as any).truvaPayment.payer }));
      }).catch((err) => {
        res.statusCode = 500;
        res.end(String(err));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it("answers 402 with truva-vault payment requirements", async () => {
    const res = await fetch(`${baseUrl}/report`);
    expect(res.status).to.equal(402);

    const body = await res.json();
    expect(body.accepts).to.have.length(1);
    expect(body.accepts[0]).to.include({
      scheme: "truva-vault",
      maxAmountRequired: String(PRICE),
      asset: mint.toBase58(),
      payTo: seller.publicKey.toBase58(),
    });
    expect(body.accepts[0].extra.programId).to.equal(program.programId.toBase58());
  });

  it("reads the vault through the SDK client", async () => {
    const vault = await new TruvaClient(connection).getVault(
      owner.publicKey,
      agent.publicKey,
      mint
    );
    expect(vault).to.not.equal(null);
    expect(vault!.perTxLimit).to.equal(BigInt(5 * UNIT));
    expect(vault!.dailyLimit).to.equal(BigInt(5 * UNIT));
    expect(vault!.balance).to.equal(BigInt(50 * UNIT));
    expect(vault!.allowlist.map((k) => k.toBase58())).to.deep.equal([seller.publicKey.toBase58()]);

    const passport = await new TruvaClient(connection).getAgentScore(agent.publicKey);
    expect(passport.tier).to.equal("Silver");
    expect(passport.trusted).to.equal(true);
  });

  it("serves the resource after the agent pays from its vault", async () => {
    const res = await pay("/report");
    expect(res.status, await res.clone().text()).to.equal(200);

    const body = await res.json();
    expect(body.data).to.equal("paid content");
    expect(body.paidBy).to.equal(agent.publicKey.toBase58());

    const receipt = JSON.parse(
      Buffer.from(res.headers.get("x-payment-response")!, "base64").toString()
    );
    expect(receipt.success).to.equal(true);
    const status = await connection.getSignatureStatus(receipt.signature);
    expect(status.value?.err).to.equal(null);

    expect(await balance(sellerToken)).to.equal(PRICE);
    expect(await balance(vaultToken)).to.equal(50 * UNIT - PRICE);
  });

  it("buyer guard refuses a price above the agent's maximum without paying", async () => {
    await expectRejected(pay("/report", { maxAmount: 1 * UNIT }), "above the agent's maximum");
    expect(await balance(sellerToken)).to.equal(PRICE);
  });

  it("rejects an underpayment", async () => {
    const requirements = buildPaymentRequirements({
      payTo: seller.publicKey,
      mint,
      amount: 1,
      resource: "/report",
      network: "solana-localnet",
    });
    const header = await createVaultPayment({
      connection,
      agent,
      vaultOwner: owner.publicKey,
      requirements,
    });

    const res = await fetch(`${baseUrl}/report`, { headers: { "X-PAYMENT": header } });
    expect(res.status).to.equal(402);
    expect((await res.json()).error).to.include("below the price");
    expect(await balance(sellerToken)).to.equal(PRICE);
  });

  it("rejects a payment addressed to someone else", async () => {
    const other = Keypair.generate();
    await getOrCreateAssociatedTokenAccount(connection, admin, mint, other.publicKey);
    const header = await createVaultPayment({
      connection,
      agent,
      vaultOwner: owner.publicKey,
      requirements: buildPaymentRequirements({
        payTo: other.publicKey,
        mint,
        amount: PRICE,
        resource: "/report",
        network: "solana-localnet",
      }),
    });

    const res = await fetch(`${baseUrl}/report`, { headers: { "X-PAYMENT": header } });
    expect(res.status).to.equal(402);
    expect((await res.json()).error).to.include("not addressed to this seller");
  });

  it("refuses an agent below the seller's tier", async () => {
    await expectRejected(pay("/premium"), "InsufficientTrustTier");
    expect(await balance(sellerToken)).to.equal(PRICE);
  });

  it("stops the agent at the vault's daily limit", async () => {
    await pay("/report"); // 4 of 5 spent
    await expectRejected(pay("/report"), "ExceedsDailyLimit");
    expect(await balance(sellerToken)).to.equal(2 * PRICE);
  });

  it("stops the agent while the owner has paused the vault", async () => {
    await sendAndConfirmTransaction(
      connection,
      new Transaction()
        .add(
          updateVaultPolicyIx(owner.publicKey, agent.publicKey, mint, {
            perTxLimit: 5 * UNIT,
            dailyLimit: 20 * UNIT,
            allowlist: [seller.publicKey],
          })
        )
        .add(setVaultPausedIx(owner.publicKey, agent.publicKey, mint, true)),
      [owner]
    );

    await expectRejected(pay("/report"), "VaultPaused");

    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(setVaultPausedIx(owner.publicKey, agent.publicKey, mint, false)),
      [owner]
    );
    expect((await pay("/report")).status).to.equal(200);
    expect(await balance(sellerToken)).to.equal(3 * PRICE);
  });
});
