/**
 * x402 Vault Paywall Demo
 *
 * An AI agent buys from a paywalled API (HTTP 402) using a Truva agent vault.
 * The owner funds the vault and sets limits; the agent can only spend through
 * the program, which stops it when a limit, a pause, a freeze or the seller's
 * tier requirement says no.
 *
 * Runs against any cluster where the TrustGate program is deployed:
 *   SOLANA_RPC_URL   RPC endpoint            (default http://127.0.0.1:8899)
 *   WALLET           funding wallet keypair  (default ~/.config/solana/id.json)
 *   SCORER_KEYPAIR   protocol scorer keypair (default: WALLET)
 *
 * The wallet pays for setup and acts as vault owner. If the protocol config
 * does not exist yet, the wallet must be the program's upgrade authority.
 *
 * Usage: npm run demo:x402
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/spl-token";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import { AddressInfo } from "net";
import {
  PaymentRejectedError,
  TruvaClient,
  createVaultIx,
  deriveAssociatedTokenAddress,
  deriveConfigPDA,
  derivePassportPDA,
  deriveVaultPDA,
  fetchWithVault,
  initializePassportIx,
  setVaultPausedIx,
  truvaPaywall,
} from "../sdk/src";

const RPC_URL = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
const WALLET_PATH = process.env.WALLET || path.join(os.homedir(), ".config", "solana", "id.json");
const UNIT = 1_000_000; // demo token has 6 decimals, like USDC
const PRICE = 1 * UNIT;

const loadKeypair = (file: string) =>
  Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf-8"))));

const step = (n: number, text: string) => console.log(`\n[${n}] ${text}`);
const usd = (base: number | bigint) => `${(Number(base) / UNIT).toFixed(2)} dUSD`;

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = loadKeypair(WALLET_PATH);
  const scorer = process.env.SCORER_KEYPAIR ? loadKeypair(process.env.SCORER_KEYPAIR) : wallet;

  const idl = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../app/lib/idl/trustgate.json"), "utf-8")
  );
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  const program = new anchor.Program(idl as anchor.Idl, provider) as anchor.Program<any>;
  const truva = new TruvaClient(connection);

  console.log("Truva x402 vault paywall demo");
  console.log(`  RPC:     ${RPC_URL}`);
  console.log(`  Program: ${program.programId.toBase58()}`);

  // ── Setup ──

  step(1, "Protocol config");
  const [configPda] = deriveConfigPDA();
  let config = await truva.getConfig();
  if (!config) {
    const [programData] = PublicKey.findProgramAddressSync(
      [program.programId.toBuffer()],
      new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
    );
    await program.methods
      .initializeConfig(scorer.publicKey)
      .accounts({
        config: configPda,
        admin: wallet.publicKey,
        program: program.programId,
        programData,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    config = await truva.getConfig();
    console.log("    created");
  }
  if (!config!.scorer.equals(scorer.publicKey)) {
    throw new Error(
      `Protocol scorer is ${config!.scorer.toBase58()}. Set SCORER_KEYPAIR to that key.`
    );
  }
  console.log(`    scorer: ${config!.scorer.toBase58()}`);

  step(2, "Actors: owner (funds the vault), agent (spends), seller (paywalled API)");
  const owner = wallet;
  const agent = Keypair.generate();
  const seller = Keypair.generate();
  // The agent only needs SOL for transaction fees
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: agent.publicKey,
        lamports: 20_000_000,
      })
    ),
    [wallet]
  );
  const mint = await createMint(connection, wallet, wallet.publicKey, null, 6);
  const ownerToken = (
    await getOrCreateAssociatedTokenAccount(connection, wallet, mint, owner.publicKey)
  ).address;
  const sellerToken = (
    await getOrCreateAssociatedTokenAccount(connection, wallet, mint, seller.publicKey)
  ).address;
  await mintTo(connection, wallet, mint, ownerToken, wallet, 100 * UNIT);
  console.log(`    agent:  ${agent.publicKey.toBase58()}`);
  console.log(`    seller: ${seller.publicKey.toBase58()}`);
  console.log(`    token:  ${mint.toBase58()} (demo USD, 6 decimals)`);

  step(3, "Agent passport: created by the agent, scored Silver by the protocol scorer");
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(initializePassportIx(agent.publicKey, agent.publicKey)),
    [agent]
  );
  const [passportPda] = derivePassportPDA(agent.publicKey);
  await program.methods
    .updateTrustTier(62, { silver: {} })
    .accounts({ passport: passportPda, authority: scorer.publicKey })
    .signers([scorer])
    .rpc();
  const passport = await truva.getAgentScore(agent.publicKey);
  console.log(`    tier ${passport.tier}, score ${passport.score}, trusted ${passport.trusted}`);

  step(4, "Owner creates the vault: 1.00 per payment, 2.00 per day, this seller only");
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createVaultIx(owner.publicKey, agent.publicKey, mint, {
        perTxLimit: 1 * UNIT,
        dailyLimit: 2 * UNIT,
        allowlist: [seller.publicKey],
      })
    ),
    [owner]
  );
  const [vault] = deriveVaultPDA(owner.publicKey, agent.publicKey, mint);
  await transfer(
    connection, owner, ownerToken, deriveAssociatedTokenAddress(mint, vault), owner, 10 * UNIT
  );
  console.log(`    vault ${vault.toBase58()} funded with ${usd(10 * UNIT)}`);

  step(5, "Seller starts a paywalled API: /report costs 1.00, /premium costs 1.00 and needs Gold");
  const paywall = (minTier: "Bronze" | "Gold") =>
    truvaPaywall({ connection, payTo: seller.publicKey, mint, amount: PRICE, minTier });
  const routes: Record<string, ReturnType<typeof truvaPaywall>> = {
    "/report": paywall("Bronze"),
    "/premium": paywall("Gold"),
  };
  const server = http.createServer((req, res) => {
    const gate = routes[req.url ?? ""];
    if (!gate) {
      res.statusCode = 404;
      res.end();
      return;
    }
    gate(req, res, () => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ report: "SOL liquidity is up 4% this week" }));
    }).catch((err) => {
      res.statusCode = 500;
      res.end(String(err));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  console.log(`    listening on ${baseUrl}`);

  // ── The agent shops ──

  const buy = async (route: string) => {
    try {
      const res = await fetchWithVault(`${baseUrl}${route}`, undefined, {
        connection,
        agent,
        vaultOwner: owner.publicKey,
        maxAmount: 1 * UNIT,
        mint,
      });
      const receipt = JSON.parse(
        Buffer.from(res.headers.get("x-payment-response")!, "base64").toString()
      );
      console.log(`    PAID    ${route} -> ${JSON.stringify(await res.json())}`);
      console.log(`            tx ${receipt.signature}`);
    } catch (err) {
      if (!(err instanceof PaymentRejectedError)) throw err;
      console.log(`    BLOCKED ${route} -> ${err.reason}`);
    }
  };

  step(6, "Agent requests /report without paying");
  const unpaid = await fetch(`${baseUrl}/report`);
  const challenge: any = await unpaid.json();
  console.log(`    HTTP ${unpaid.status}: ${challenge.error}`);
  console.log(`    accepts: ${challenge.accepts[0].scheme}, ${usd(Number(challenge.accepts[0].maxAmountRequired))}`);

  step(7, "Agent pays from its vault");
  await buy("/report");

  step(8, "Agent tries /premium, which needs Gold (agent is Silver)");
  await buy("/premium");

  step(9, "Agent keeps buying until the owner's daily limit stops it");
  await buy("/report");
  await buy("/report");

  step(10, "Owner pauses the vault");
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(setVaultPausedIx(owner.publicKey, agent.publicKey, mint, true)),
    [owner]
  );
  await buy("/report");
  await sendAndConfirmTransaction(
    connection,
    new Transaction().add(setVaultPausedIx(owner.publicKey, agent.publicKey, mint, false)),
    [owner]
  );

  step(11, "Kill switch: the scorer freezes the agent's passport");
  await program.methods
    .freezePassport()
    .accounts({ passport: passportPda, authority: scorer.publicKey })
    .signers([scorer])
    .rpc();
  await buy("/report");

  // ── Result ──

  const state = await truva.getVault(owner.publicKey, agent.publicKey, mint);
  const sellerBalance = (await getAccount(connection, sellerToken)).amount;
  console.log("\nResult");
  console.log(`  seller received:  ${usd(sellerBalance)}`);
  console.log(`  vault balance:    ${usd(state!.balance)}`);
  console.log(`  spent today:      ${usd(state!.spentInWindow)} of ${usd(state!.dailyLimit)}`);

  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
