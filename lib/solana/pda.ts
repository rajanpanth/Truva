import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

const TRUVA_PROGRAM_ID = new PublicKey('TRVAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.slice(0, 44).padEnd(44, '1'));

export function deriveAgentPDA(agentPublicKey: string, seed: string): string {
  try {
    const agentKey = new PublicKey(agentPublicKey);
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('truva_agent'),
        agentKey.toBuffer(),
        Buffer.from(seed),
      ],
      TRUVA_PROGRAM_ID
    );
    return pda.toBase58();
  } catch {
    const hash = Array.from(
      new Uint8Array(
        Buffer.from(`truva_pda_${agentPublicKey}_${seed}`)
      )
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `PDA_${hash.slice(0, 40)}`;
  }
}

export function generateSimulatedPDA(agentName: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `PDA_${agentName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${timestamp}_${random}`;
}
