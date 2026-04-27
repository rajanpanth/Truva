/**
 * simulateTransactions.ts
 *
 * Simulates 50 transactions for a given agent pubkey.
 * Mix of 85% success and 15% failure.
 * Random counterparties and volumes.
 * Triggers score recalculation after each batch of 10.
 *
 * Usage: npx ts-node scripts/simulateTransactions.ts <agent_pubkey>
 */

import { Keypair } from "@solana/web3.js";

const API_URL = process.env.TRUVA_API_URL || "http://localhost:3001";
const TOTAL_TRANSACTIONS = 50;
const BATCH_SIZE = 10;
const SUCCESS_RATE = 0.85;

// ── Helpers ──

function randomCounterparty(): string {
  return Keypair.generate().publicKey.toBase58();
}

function randomTxHash(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "";
  for (let i = 0; i < 88; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

async function apiCall(method: string, path: string, body?: any): Promise<any> {
  const url = `${API_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  return res.json();
}

// ── Main ──

async function main() {
  const agentPubkey = process.argv[2];

  if (!agentPubkey) {
    console.error("Usage: npx ts-node scripts/simulateTransactions.ts <agent_pubkey>");
    console.error("");
    console.error("Example:");
    console.error(
      "  npx ts-node scripts/simulateTransactions.ts 7XsJcQkPbKzE9y4VJW1aSDqRbv56qWoZrFA8ZxQeW4YB"
    );
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════");
  console.log("  🚀 Truva Transaction Simulator");
  console.log("═══════════════════════════════════════════");
  console.log(`  Agent: ${agentPubkey}`);
  console.log(`  API:   ${API_URL}`);
  console.log(`  Transactions: ${TOTAL_TRANSACTIONS}`);
  console.log(`  Success Rate: ${SUCCESS_RATE * 100}%`);
  console.log("");

  // Verify agent exists
  try {
    const agent = await apiCall("GET", `/api/agents/${agentPubkey}`);
    if (!agent.success) {
      console.error(`❌ Agent not found: ${agentPubkey}`);
      console.error("   Register the agent first with: POST /api/agents/register");
      process.exit(1);
    }
    console.log(
      `✅ Agent found — Current Score: ${agent.data.current_score}, Tier: ${agent.data.current_tier}`
    );
  } catch (err: any) {
    console.error(`❌ Could not reach API: ${err.message}`);
    process.exit(1);
  }

  console.log("");

  // Generate unique counterparties
  const counterparties = Array.from({ length: 15 }, () => randomCounterparty());

  let successCount = 0;
  let failCount = 0;

  for (let i = 1; i <= TOTAL_TRANSACTIONS; i++) {
    const success = Math.random() < SUCCESS_RATE;
    const counterparty = counterparties[Math.floor(Math.random() * counterparties.length)];
    const volume = Math.floor(Math.random() * 5_000_000_000); // 0-5 SOL
    const timestamp = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 7 * 86400); // last 7 days

    if (success) successCount++;
    else failCount++;

    const icon = success ? "✅" : "❌";
    const volSol = (volume / 1_000_000_000).toFixed(3);
    console.log(
      `  ${icon} TX ${i.toString().padStart(2, "0")}/${TOTAL_TRANSACTIONS} | ${volSol} SOL | ${counterparty.slice(0, 8)}...`
    );

    // Check if we've completed a batch
    if (i % BATCH_SIZE === 0) {
      console.log(`\n  📊 Batch ${i / BATCH_SIZE} complete — Requesting score recalculation...`);
      try {
        const scoreResult = await apiCall("GET", `/api/agents/${agentPubkey}/score`);
        if (scoreResult.success) {
          console.log(
            `     Score: ${scoreResult.data.score}, Tier: ${scoreResult.data.tier}`
          );
        }
      } catch {
        console.log("     ⚠️  Score check failed");
      }
      console.log("");
    }

    // Small delay between transactions
    await new Promise((r) => setTimeout(r, 50));
  }

  // Final summary
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  ✨ Simulation Complete!");
  console.log("═══════════════════════════════════════════");
  console.log(`  Total: ${TOTAL_TRANSACTIONS}`);
  console.log(`  Success: ${successCount} (${((successCount / TOTAL_TRANSACTIONS) * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${failCount} (${((failCount / TOTAL_TRANSACTIONS) * 100).toFixed(1)}%)`);

  // Final score check
  try {
    const finalScore = await apiCall("GET", `/api/agents/${agentPubkey}/score`);
    if (finalScore.success) {
      console.log(`\n  📊 Final Score: ${finalScore.data.score}, Tier: ${finalScore.data.tier}`);
    }
  } catch {
    // ignore
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
