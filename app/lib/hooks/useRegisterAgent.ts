'use client';

import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TRUSTGATE_PROGRAM_ID, getPassportPDA, getTrustGateProgram } from '@/lib/solana';
import TRUSTGATE_IDL from '@/lib/idl/trustgate.json';
import { signRegisterAgentMessage, SIGN_MESSAGE_UNSUPPORTED } from '@/lib/auth/signRegisterMessage';

interface RegisterResult {
  pdaAddress: string;
  txSignature: string;
}

/**
 * Hook to register an agent on-chain by calling initialize_passport,
 * signing the canonical register message with the wallet, then POST to
 * /api/agents with the tx signature, PDA and wallet-signature proof.
 */
export function useRegisterAgent() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerAgent = useCallback(
    async (agentData: {
      name: string;
      public_key: string;
      operator_name: string;
      operator_email: string;
      task_type: string;
      description?: string;
      max_tx_size: number;
      rate_limit: number;
      chains: string[];
      spending_behavior?: string;
      metadata?: Record<string, unknown>;
      trust_score?: number;
    }): Promise<RegisterResult | null> => {
      if (!publicKey || !wallet.signTransaction) {
        setError('Wallet not connected');
        return null;
      }
      // POST /api/agents requires a signed message; fail before sending the on-chain tx.
      if (!wallet.signMessage) {
        setError(SIGN_MESSAGE_UNSUPPORTED);
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const agentPubkey = new PublicKey(agentData.public_key);
        const [passportPDA] = getPassportPDA(agentPubkey);

        const { AnchorProvider } = await import('@coral-xyz/anchor');
        const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
        const program = getTrustGateProgram(provider, TRUSTGATE_IDL as any);

        const [configPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('config')],
          TRUSTGATE_PROGRAM_ID
        );

        const signature = await (program.methods as any)
          .initializePassport()
          .accounts({
            config: configPDA,
            passport: passportPDA,
            agent: agentPubkey,
            payer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        await connection.confirmTransaction(signature, 'confirmed');

        // Prove control of the paying wallet for this agent key (verified server-side)
        const auth = await signRegisterAgentMessage(wallet.signMessage, {
          publicKey: agentData.public_key,
          wallet: publicKey.toBase58(),
        });

        // Register in backend database
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...agentData,
            ...auth,
            trust_score: agentData.trust_score ?? 50,
            tx_signature: signature,
            pda_address: passportPDA.toBase58(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to register agent');
        }

        return {
          pdaAddress: passportPDA.toBase58(),
          txSignature: signature,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, wallet, connection]
  );

  return { registerAgent, isLoading, error };
}
