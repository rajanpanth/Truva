'use client';

import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TRUSTGATE_PROGRAM_ID, getPassportPDA } from '@/lib/solana';

interface RegisterResult {
  pdaAddress: string;
  txSignature: string;
}

/**
 * Hook to register an agent on-chain by calling initialize_passport,
 * then POST to /api/agents with the tx signature and PDA.
 */
export function useRegisterAgent() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
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
      metadata?: Record<string, unknown>;
      trust_score?: number;
    }): Promise<RegisterResult | null> => {
      if (!publicKey || !sendTransaction) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const agentPubkey = new PublicKey(agentData.public_key);
        const [passportPDA] = getPassportPDA(agentPubkey);
        const trustScore = agentData.trust_score ?? 50;

        // Build the initialize_passport instruction manually
        // Discriminator for initialize_passport (Anchor 8-byte hash)
        // In production, use the generated IDL/program client
        const { Transaction, TransactionInstruction } = await import('@solana/web3.js');
        const { BorshCoder } = await import('@coral-xyz/anchor');

        // For now, use a memo instruction as a placeholder until IDL is generated
        // The actual on-chain call would use: program.methods.initializePassport(trustScore)
        const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
        const memoData = Buffer.from(
          JSON.stringify({
            action: 'initialize_passport',
            agent: agentData.public_key,
            trust_score: trustScore,
            passport_pda: passportPDA.toBase58(),
          })
        );

        const memoIx = new TransactionInstruction({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
          programId: memoProgram,
          data: memoData,
        });

        const tx = new Transaction().add(memoIx);
        tx.feePayer = publicKey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        // Register in backend database
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...agentData,
            trust_score: trustScore,
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
    [publicKey, sendTransaction, connection]
  );

  return { registerAgent, isLoading, error };
}
