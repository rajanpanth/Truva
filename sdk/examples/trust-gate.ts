/**
 * Trust-Gate Demo — @truva/sdk
 *
 * Shows the complete flow: register → score → gate payment
 *
 * Run:
 *   cd sdk && npm install && npx ts-node examples/trust-gate.ts
 *
 * Requirements:
 *   - Reputation engine running at http://localhost:3001
 *   - Solana devnet connection
 */

import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { TruvaClient, AgentWallet, TruvaError, derivePassportPDA } from "../src/index";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const API_URL = process.env.TRUVA_API_URL ?? "http://localhost:3001";

const agentPubkey = new PublicKey("5cR5PY9VVtAij6qAaifqRqKcDK2xbzYUiibzDZvgsVQo");

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Use AgentWallet for headless operation
  const agentWallet = AgentWallet.generate();
  const client = agentWallet.createClient(connection, { apiUrl: API_URL });

  console.log("=== Truva Protocol — Trust Gate Demo ===\n");

  // 1. Derive PDA
  const [pda, bump] = derivePassportPDA(agentPubkey);
  console.log(`Agent:       ${agentPubkey.toBase58()}`);
  console.log(`Passport PDA: ${pda.toBase58()} (bump: ${bump})\n`);

  // 2. Read score from REST API profile
  try {
    console.log("Fetching agent profile from reputation engine...");
    const profile = await client.getAgentProfile(agentPubkey);
    console.log(`  Tier:         ${profile.tier}`);
    console.log(`  Score:        ${profile.score}`);
    console.log(`  Tasks done:   ${profile.txCount}`);
    console.log(`  Success rate: ${(profile.successRate * 100).toFixed(1)}%`);
    console.log(`  Frozen:       ${profile.frozen}\n`);
  } catch (err) {
    console.warn("  (Could not fetch profile — reputation engine offline?)");
  }

  // 3. Check eligibility for a Gold-tier 10 SOL payment
  console.log("Checking eligibility for Gold tier, 10 SOL...");
  const eligible = await client.isEligible(agentPubkey, "Gold", 10_000_000_000);
  console.log(`  Eligible: ${eligible}\n`);

  // 4. Attempt to gate a payment at Silver tier
  console.log("Attempting to gate payment at Silver tier...");
  try {
    await client.requireTrustTier("Silver", agentPubkey);
    console.log("  ✅ Trust gate PASSED — payment can proceed\n");
  } catch (err) {
    if (err instanceof TruvaError) {
      console.log(`  ❌ Trust gate BLOCKED`);
      console.log(`     Current tier:  ${err.currentTier}`);
      console.log(`     Required tier: ${err.requiredTier}\n`);
    } else {
      console.warn("  (Could not check — on-chain read failed, devnet may be unreachable)\n");
    }
  }

  // 5. Score history
  try {
    console.log("Fetching score history...");
    const history = await client.getScoreHistory(agentPubkey);
    if (history.length === 0) {
      console.log("  No history yet.\n");
    } else {
      history.slice(0, 5).forEach((h) => {
        console.log(`  ${h.recordedAt}  score=${h.score}  tier=${h.tier}`);
      });
      console.log();
    }
  } catch {
    console.warn("  (Could not fetch history)\n");
  }

  console.log("Done.");
}

main().catch(console.error);
