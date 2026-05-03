'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

const PER_API = 'https://payments.magicblock.app';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// USDC devnet mint
const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export type PaymentStatus =
  | 'idle'
  | 'challenge'
  | 'signing'
  | 'building'
  | 'submitting'
  | 'confirmed'
  | 'error';

export interface PaymentLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
}

export interface PrivatePaymentOptions {
  toAddress: string;
  mint?: string;
  /** Amount in base units (e.g. 1_000_000 = 1 USDC) */
  amount: number;
  memo?: string;
}

export function useMagicBlockPayment() {
  const { publicKey, signMessage, signTransaction } = useWallet();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [logs, setLogs] = useState<PaymentLog[]>([]);

  const addLog = useCallback((message: string, type: PaymentLog['type'] = 'info') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs((prev) => [...prev.slice(-49), { timestamp, message, type }]);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxSignature(null);
    setLogs([]);
  }, []);

  const sendPrivatePayment = useCallback(
    async (opts: PrivatePaymentOptions): Promise<string | null> => {
      if (!publicKey || !signMessage || !signTransaction) {
        addLog('Wallet not connected', 'error');
        return null;
      }

      try {
        // ── Step 1: Get challenge from PER API ──
        setStatus('challenge');
        addLog('[MagicBlock] Requesting auth challenge from Private ER...', 'info');

        const challengeRes = await fetch(
          `${PER_API}/v1/spl/challenge?wallet=${publicKey.toBase58()}`
        );
        if (!challengeRes.ok) {
          throw new Error(`Challenge request failed: ${challengeRes.status}`);
        }
        const { challenge } = await challengeRes.json() as { challenge: string };
        addLog(`[MagicBlock] Challenge received · ${challenge.slice(0, 24)}...`, 'info');

        // ── Step 2: Sign the challenge ──
        setStatus('signing');
        addLog('[MagicBlock] Signing challenge with wallet...', 'info');
        const encoded = new TextEncoder().encode(challenge);
        const signature = await signMessage(encoded);
        const signatureB58 = Buffer.from(signature).toString('base64');
        addLog('[MagicBlock] Challenge signed ✓', 'success');

        // ── Step 3: Login → get bearer token ──
        addLog('[MagicBlock] Authenticating with TEE validator...', 'info');
        const loginRes = await fetch(`${PER_API}/v1/spl/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            challenge,
            signature: signatureB58,
          }),
        });
        if (!loginRes.ok) {
          throw new Error(`Login failed: ${loginRes.status}`);
        }
        const { token } = await loginRes.json() as { token: string };
        addLog('[MagicBlock] Bearer token obtained · TEE auth complete ✓', 'success');

        // ── Step 4: Build unsigned private transfer ──
        setStatus('building');
        addLog('[MagicBlock] Building private SPL transfer via PER API...', 'info');

        const transferBody = {
          from: publicKey.toBase58(),
          to: opts.toAddress,
          mint: opts.mint ?? USDC_DEVNET_MINT,
          amount: opts.amount,
          visibility: 'private',
          fromBalance: 'base',
          toBalance: 'base',
          cluster: 'devnet',
          initAtasIfMissing: true,
          initVaultIfMissing: true,
          ...(opts.memo ? { memo: opts.memo } : {}),
        };

        const transferRes = await fetch(`${PER_API}/v1/spl/transfer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transferBody),
        });

        if (!transferRes.ok) {
          const err = await transferRes.json().catch(() => ({})) as { error?: string };
          throw new Error(
            `Transfer build failed: ${transferRes.status} — ${err.error ?? 'unknown'}`
          );
        }

        const { transactionBase64, sendTo, version } = await transferRes.json() as {
          transactionBase64: string;
          sendTo: 'base' | 'ephemeral';
          version: 'legacy' | 'v0';
          recentBlockhash: string;
        };
        addLog(
          `[MagicBlock] Unsigned tx built · route=private · sendTo=${sendTo} · version=${version}`,
          'info'
        );

        // ── Step 5: Sign the transaction ──
        setStatus('submitting');
        addLog('[MagicBlock] Signing transaction with wallet...', 'info');
        const txBytes = Buffer.from(transactionBase64, 'base64');

        let signedTx: Transaction | VersionedTransaction;
        if (version === 'v0') {
          const vtx = VersionedTransaction.deserialize(txBytes);
          const signed = await signTransaction(vtx as never);
          signedTx = signed as unknown as VersionedTransaction;
        } else {
          const tx = Transaction.from(txBytes);
          signedTx = await signTransaction(tx as never);
        }
        addLog('[MagicBlock] Transaction signed ✓', 'success');

        // ── Step 6: Submit to correct RPC ──
        const rpcUrl =
          sendTo === 'ephemeral'
            ? `https://devnet-tee.magicblock.app?token=${token}`
            : DEVNET_RPC;

        addLog(
          `[MagicBlock] Submitting to ${sendTo === 'ephemeral' ? 'Private Ephemeral Rollup' : 'Solana devnet'}...`,
          'info'
        );

        const connection = new Connection(rpcUrl, 'confirmed');
        const rawTx =
          signedTx instanceof VersionedTransaction
            ? signedTx.serialize()
            : (signedTx as Transaction).serialize();

        const sig = await connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        setTxSignature(sig);
        setStatus('confirmed');
        addLog(`[MagicBlock] Private payment confirmed ✓ · sig=${sig.slice(0, 16)}...`, 'success');
        addLog('[MagicBlock] Payment amount & routing hidden on Private Ephemeral Rollup', 'success');

        return sig;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`[MagicBlock] ERROR: ${msg}`, 'error');
        setStatus('error');
        return null;
      }
    },
    [publicKey, signMessage, signTransaction, addLog]
  );

  return {
    sendPrivatePayment,
    status,
    txSignature,
    logs,
    reset,
    isLoading: ['challenge', 'signing', 'building', 'submitting'].includes(status),
  };
}
