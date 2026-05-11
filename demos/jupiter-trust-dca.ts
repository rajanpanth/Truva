/**
 * Jupiter Trust-Gated DCA Agent
 *
 * AI agent that sets up Jupiter Dollar Cost Average positions,
 * but only after passing Truva's on-chain trust verification.
 *
 * Usage: npx ts-node demos/jupiter-trust-dca.ts
 */

import { Connection, PublicKey, Keypair } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://solana-rpc.rpcfast.com/3iA4Q8dhKFv1wNYgfqaEhTpfVrjV1tttBUyVSZGGkayWHeJpGXTL6ZDNjwDaDqhg";
const PROGRAM_ID = process.env.TRUVA_PROGRAM_ID || "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5";
const JUPITER_API = "https://api.jup.ag";
const connection = new Connection(RPC_URL, "confirmed");

const TIER_MAP: Record<number, string> = { 0: "Bronze", 1: "Silver", 2: "Gold" };

function derivePassportPDA(pubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), pubkey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

function parsePassport(data: Buffer) {
  let offset = 8 + 32 + 32;
  const score = data[offset]; offset += 1;
  const tier = TIER_MAP[data[offset]] ?? "Bronze"; offset += 1;
  const txCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const successCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const frozen = data[offset] === 1;
  return { score, tier, txCount, frozen };
}

// Well-known Solana token mints
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";

/**
 * Trust-Gated DCA: Only trusted agents can set up auto-swaps
 */
async function createTrustGatedDCA(
  agentPubkey: PublicKey,
  inputMint: string,
  outputMint: string,
  amountPerSwap: number // in base units (lamports / token units)
) {
  console.log(`\n📋 Verifying agent trust for DCA position...`);

  // Step 1: Verify agent trust
  const [pda] = derivePassportPDA(agentPubkey);
  const info = await connection.getAccountInfo(pda);

  if (!info) {
    throw new Error(`No Truva passport found for ${agentPubkey.toBase58()}`);
  }

  const passport = parsePassport(info.data);
  console.log(`   Trust: ${passport.tier} (${passport.score}/100) | ${passport.txCount} txs`);

  if (passport.frozen) {
    throw new Error("Agent frozen — cannot create DCA position");
  }
  if (passport.tier === "Bronze") {
    throw new Error(`Agent ${passport.tier} tier too low for DCA. Need Silver+`);
  }

  console.log(`✅ Trust verified: ${passport.tier} tier — DCA eligible`);

  // Step 2: Get Jupiter quote
  console.log(`\n📊 Fetching Jupiter quote...`);
  try {
    const quoteRes = await fetch(
      `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountPerSwap}&slippageBps=50`
    );

    if (!quoteRes.ok) {
      console.log(`   Jupiter API returned ${quoteRes.status} (expected on devnet)`);
      return {
        success: true,
        agentTier: passport.tier,
        agentScore: passport.score,
        dca: { inputMint, outputMint, amountPerSwap, status: "quote_simulated" },
      };
    }

    const quote = await quoteRes.json();
    console.log(`   Quote received: ${amountPerSwap} → ${quote.outAmount ?? "N/A"}`);

    // Step 3: In production, execute the swap via Jupiter
    // const swapRes = await fetch(`${JUPITER_API}/swap/v2/order`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     quoteResponse: quote,
    //     userPublicKey: agentPubkey.toBase58(),
    //   }),
    // });

    return {
      success: true,
      agentTier: passport.tier,
      agentScore: passport.score,
      dca: { inputMint, outputMint, amountPerSwap, quote },
    };
  } catch (e: any) {
    console.log(`   Jupiter API unavailable (${e.message}) — simulating quote`);
    return {
      success: true,
      agentTier: passport.tier,
      agentScore: passport.score,
      dca: { inputMint, outputMint, amountPerSwap, status: "simulated" },
    };
  }
}

// Demo
async function main() {
  console.log("🪐 Jupiter Trust-Gated DCA Agent\n" + "═".repeat(50));

  const agent = Keypair.generate();
  console.log(`🔑 Agent: ${agent.publicKey.toBase58()}`);

  try {
    // Try to create a USDC → SOL DCA position (1 USDC per swap)
    const result = await createTrustGatedDCA(
      agent.publicKey,
      USDC_MINT,
      SOL_MINT,
      1_000_000 // 1 USDC (6 decimals)
    );
    console.log(`\n📊 Result:`, JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.log(`\n⛔ ${e.message}`);
    console.log("Register and build trust via Truva Protocol first.");
  }

  console.log("\n" + "═".repeat(50));
  console.log("In production, this agent would:");
  console.log("  1. Maintain a Truva passport with Silver+ tier");
  console.log("  2. Set up recurring Jupiter DCA positions");
  console.log("  3. Auto-pause DCA if trust drops below threshold");
}

main().catch(console.error);
