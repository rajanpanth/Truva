import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';

// Use a valid base58 public key for the "program ID" placeholder
// This is a deterministic keypair derived from the seed "truva" — not a real deployed program
const TRUVA_PROGRAM_ID_STR = '11111111111111111111111111111112';

let _programId: PublicKey | null = null;
function getProgramId(): PublicKey {
  if (!_programId) {
    _programId = new PublicKey(TRUVA_PROGRAM_ID_STR);
  }
  return _programId;
}

export function deriveAgentPDA(agentPublicKey: string, seed: string): string {
  try {
    const agentKey = new PublicKey(agentPublicKey);
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('truva_agent'),
        agentKey.toBuffer(),
        Buffer.from(seed),
      ],
      getProgramId()
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
