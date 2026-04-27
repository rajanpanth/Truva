import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { TRUSTGATE_PROGRAM_ID } from '@/lib/solana';

/**
 * Derive the Passport PDA for a given agent pubkey.
 * Uses the SAME seeds as the Anchor program: ["passport", agent_pubkey]
 */
export function deriveAgentPDA(agentPublicKey: string): string {
  try {
    const agentKey = new PublicKey(agentPublicKey);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('passport'), agentKey.toBuffer()],
      TRUSTGATE_PROGRAM_ID
    );
    return pda.toBase58();
  } catch {
    // Fallback for invalid pubkeys (e.g., during form input)
    return `PDA_PENDING_${agentPublicKey.slice(0, 16)}`;
  }
}

/**
 * Generate a simulated PDA address for demo/development use.
 * In production, always use deriveAgentPDA() instead.
 */
export function generateSimulatedPDA(agentName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `PDA_${agentName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${timestamp}_${random}`;
}
