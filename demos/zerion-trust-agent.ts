/**
 * Zerion Trust-Gated Agent Demo
 * 
 * Autonomous trading agent that verifies counterparty trust
 * via Truva Protocol before executing any on-chain swap.
 *
 * Usage: npx ts-node demos/zerion-trust-agent.ts
 */

import { Connection, PublicKey, Keypair } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://solana-rpc.rpcfast.com/3iA4Q8dhKFv1wNYgfqaEhTpfVrjV1tttBUyVSZGGkayWHeJpGXTL6ZDNjwDaDqhg";
const PROGRAM_ID = process.env.TRUVA_PROGRAM_ID || "BTgy2r8R85Jknq3JetNiVt1x9grdccm7pTV2LyUmDzG5";
const connection = new Connection(RPC_URL, "confirmed");

const TIER_MAP: Record<number, string> = { 0: "Bronze", 1: "Silver", 2: "Gold" };
const TIER_RANK: Record<string, number> = { Bronze: 0, Silver: 1, Gold: 2 };

function derivePassportPDA(pubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("passport"), pubkey.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );
}

function parsePassport(data: Buffer) {
  let offset = 8 + 32 + 32; // skip discriminator + agent + authority
  const score = data[offset]; offset += 1;
  const tier = TIER_MAP[data[offset]] ?? "Bronze"; offset += 1;
  const txCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const successCount = Number(data.readBigUInt64LE(offset)); offset += 8;
  const frozen = data[offset] === 1;
  return { score, tier, txCount, successRate: txCount > 0 ? successCount / txCount : 0, frozen };
}

async function getAgentScore(pubkey: PublicKey) {
  const [pda] = derivePassportPDA(pubkey);
  const info = await connection.getAccountInfo(pda);
  return info ? parsePassport(info.data) : null;
}

// Agent wallet with trust gating
class AgentWallet {
  readonly keypair: Keypair;
  readonly publicKey: PublicKey;
  private constructor(kp: Keypair) { this.keypair = kp; this.publicKey = kp.publicKey; }
  static generate() { return new AgentWallet(Keypair.generate()); }
}

// Middleware: wraps any function with automatic trust check
function wrapWithTrustGate<T extends (...args: any[]) => Promise<any>>(
  agentPubkey: PublicKey, requiredTier: string, fn: T
): T {
  return (async (...args: any[]) => {
    const passport = await getAgentScore(agentPubkey);
    if (!passport) throw new Error(`BLOCKED: No Truva passport for ${agentPubkey.toBase58()}`);
    if (passport.frozen) throw new Error(`BLOCKED: Agent is frozen`);
    if ((TIER_RANK[passport.tier] ?? 0) < (TIER_RANK[requiredTier] ?? 0))
      throw new Error(`BLOCKED: ${passport.tier} < ${requiredTier}`);
    console.log(`✅ Trust gate passed: ${passport.tier} (${passport.score}/100)`);
    return fn(...args);
  }) as any as T;
}

// Core trading function — checks counterparty trust before swapping
async function executeSwap(counterparty: PublicKey, amountSol: number) {
  const cp = await getAgentScore(counterparty);
  if (!cp) return { success: false, detail: "No passport found for counterparty" };
  if (cp.frozen) return { success: false, detail: "Counterparty is frozen" };
  if ((TIER_RANK[cp.tier] ?? 0) < TIER_RANK["Silver"])
    return { success: false, detail: `${cp.tier} tier too low. Need Silver+` };

  console.log(`🔍 Counterparty: ${cp.tier} (${cp.score}/100) | ${cp.txCount} txs`);
  // In production: const zerion = new ZerionCLI({ wallet: agent.keypair });
  // await zerion.swap({ inputToken: "SOL", outputToken: "USDC", amount: amountSol });
  console.log(`💱 Trade: ${amountSol} SOL with ${cp.tier}-tier agent`);
  return { success: true, counterpartyTier: cp.tier, amountSol };
}

// Demo
async function main() {
  console.log("🤖 Zerion Trust-Gated Agent Demo\n" + "═".repeat(50));
  const agent = AgentWallet.generate();
  console.log(`🔑 Agent: ${agent.publicKey.toBase58()}`);
  const gatedSwap = wrapWithTrustGate(agent.publicKey, "Silver", executeSwap);
  const sample = Keypair.generate().publicKey;
  try {
    const result = await gatedSwap(sample, 1.0);
    console.log("Result:", result);
  } catch (e: any) {
    console.log(`⛔ ${e.message}`);
    console.log("Expected — register the agent first via Truva dashboard or SDK.");
  }
}

main().catch(console.error);
