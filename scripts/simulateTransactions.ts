/**
 * simulateTransactions.ts
 *
 * Simulates payment attempts through the TrustGate:
 *   1. Agent A (Bronze) → Gold gate → ❌ Should FAIL
 *   2. Agent B (Gold)   → Gold gate → ✅ Should PASS
 *   3. Agent A (Bronze) → Bronze gate → ✅ Should PASS
 *
 * Usage: npx ts-node scripts/simulateTransactions.ts
 *
 * Prereq: Run `npx ts-node scripts/seedAgents.ts` first
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const IDL_PATH = path.resolve(__dirname, "../target/idl/trustgate.json");
const AGENTS_PATH = path.resolve(__dirname, "seeded-agents.json");

async function main() {
  // Setup
  const connection = new Connection("http://localhost:8899", "confirmed");

  const walletPath =
    process.env.ANCHOR_WALLET ||
    `${process.env.HOME || process.env.USERPROFILE}/.config/solana/id.json`;
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const authority = Keypair.fromSecretKey(Uint8Array.from(secretKey));

  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load IDL + seeded agents
  let idl: anchor.Idl;
  try {
    idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
  } catch {
    console.error("❌ IDL not found. Run `anchor build` first.");
    process.exit(1);
  }

  let agents: any;
  try {
    agents = JSON.parse(fs.readFileSync(AGENTS_PATH, "utf-8"));
  } catch {
    console.error("❌ Seeded agents not found. Run `npx ts-node scripts/seedAgents.ts` first.");
    process.exit(1);
  }

  const programId = new PublicKey(idl.address || "TRSTgateXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
  const program = new Program(idl, programId, provider);

  const agentA = Keypair.fromSecretKey(Uint8Array.from(agents.agentA.secretKey));
  const agentB = Keypair.fromSecretKey(Uint8Array.from(agents.agentB.secretKey));
  const recipient = Keypair.generate();

  console.log("═══════════════════════════════════════════════");
  console.log("  🚀 Agent Passport — TrustGate Simulation");
  console.log("═══════════════════════════════════════════════");
  console.log("");

  // Airdrop SOL to agents for payments
  console.log("💰 Airdropping SOL to agents...");
  await connection.requestAirdrop(agentA.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.requestAirdrop(agentB.publicKey, 2 * LAMPORTS_PER_SOL);
  // Wait for airdrop confirmation
  await new Promise((r) => setTimeout(r, 2000));
  console.log("   ✅ Agents funded\n");

  const paymentAmount = 0.1 * LAMPORTS_PER_SOL;

  // ---- Simulation 1: Agent A (Bronze) → Gold gate → FAIL ----
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 1: Agent A (Bronze) → Gold Gate");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [passportA] = PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentA.publicKey.toBuffer()],
    programId
  );

  try {
    await program.methods
      .processPaymentWithTrustCheck({ gold: {} }, new anchor.BN(paymentAmount))
      .accounts({
        passport: passportA,
        agent: agentA.publicKey,
        recipient: recipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentA])
      .rpc();
    console.log("   ⚠️  Unexpected: Payment went through");
  } catch (err: any) {
    console.log("   ❌ BLOCKED — InsufficientTrust (expected!)");
    console.log(`   └─ ${err.message.slice(0, 80)}`);
  }
  console.log("");

  // ---- Simulation 2: Agent B (Gold) → Gold gate → PASS ----
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 2: Agent B (Gold) → Gold Gate");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const [passportB] = PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), agentB.publicKey.toBuffer()],
    programId
  );

  try {
    await program.methods
      .processPaymentWithTrustCheck({ gold: {} }, new anchor.BN(paymentAmount))
      .accounts({
        passport: passportB,
        agent: agentB.publicKey,
        recipient: recipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentB])
      .rpc();
    console.log("   ✅ PASSED — Payment executed successfully");
  } catch (err: any) {
    console.log("   ❌ Error:", err.message.slice(0, 80));
  }
  console.log("");

  // ---- Simulation 3: Agent A (Bronze) → Bronze gate → PASS ----
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("TEST 3: Agent A (Bronze) → Bronze Gate");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    await program.methods
      .processPaymentWithTrustCheck({ bronze: {} }, new anchor.BN(paymentAmount))
      .accounts({
        passport: passportA,
        agent: agentA.publicKey,
        recipient: recipient.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([agentA])
      .rpc();
    console.log("   ✅ PASSED — Payment executed successfully");
  } catch (err: any) {
    console.log("   ❌ Error:", err.message.slice(0, 80));
  }

  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("  ✨ Simulation complete!");
  console.log("═══════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
