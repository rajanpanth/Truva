'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { TruvaButton, TruvaInput } from '@/components/ui/truva';
import { WalletConnectButton } from '@/components/shared/WalletConnectButton';
import {
  DEVNET_USDC_MINT, MAX_ALLOWLIST, createVaultIx, depositIx, deriveVaultPDA,
  deriveVaultTokenAccount, isTokenProgram, parseUnits,
} from '@/lib/solana/vault';

export interface CreatedVault {
  signature: string;
  vault: PublicKey;
  agent: PublicKey;
  mint: PublicKey;
  /** Deposit as typed by the owner, e.g. "25" */
  deposit: string;
  perTxLimit: string;
  dailyLimit: string;
}

interface CreateVaultFormProps {
  /** Fixes the agent the vault is for; otherwise the owner types an agent key. */
  agent?: string;
  submitLabel?: string;
  onCreated?: (created: CreatedVault) => void;
}

function parseKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value.trim());
  } catch {
    return null;
  }
}

/**
 * Creates an agent vault and, optionally, funds it in the same transaction.
 * The connected wallet becomes the vault owner.
 */
export function CreateVaultForm({ agent: fixedAgent, submitLabel = 'CREATE_VAULT', onCreated }: CreateVaultFormProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [agent, setAgent] = useState(fixedAgent ?? '');
  const [mint, setMint] = useState(DEVNET_USDC_MINT.toBase58());
  const [perTx, setPerTx] = useState('1');
  const [daily, setDaily] = useState('10');
  const [deposit, setDeposit] = useState('');
  const [recipients, setRecipients] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!publicKey) return;
    setError(null);

    const agentKey = parseKey(agent);
    const mintKey = parseKey(mint);
    if (!agentKey) return setError('Agent key is not a valid Solana address');
    if (!mintKey) return setError('Token mint is not a valid Solana address');

    const allowlist: PublicKey[] = [];
    for (const entry of recipients.split(/[\s,]+/).filter(Boolean)) {
      const key = parseKey(entry);
      if (!key) return setError(`Recipient "${entry}" is not a valid Solana address`);
      allowlist.push(key);
    }
    if (allowlist.length > MAX_ALLOWLIST) return setError(`A vault can list at most ${MAX_ALLOWLIST} recipients`);

    setBusy(true);
    try {
      const mintInfo = await connection.getParsedAccountInfo(mintKey);
      const parsed = mintInfo.value?.data;
      if (!mintInfo.value || !parsed || !('parsed' in parsed) || parsed.parsed?.type !== 'mint') {
        throw new Error('Token mint not found on devnet');
      }
      // SPL Token or Token-2022
      const tokenProgram = mintInfo.value.owner;
      if (!isTokenProgram(tokenProgram)) throw new Error('Token mint is not an SPL token');
      const decimals: number = parsed.parsed.info.decimals;

      const perTxUnits = parseUnits(perTx, decimals);
      const dailyUnits = parseUnits(daily, decimals);
      const depositUnits = deposit.trim() === '' ? BigInt(0) : parseUnits(deposit, decimals);
      if (perTxUnits === null || dailyUnits === null || depositUnits === null) {
        throw new Error('Enter amounts as numbers, e.g. 1.50');
      }
      if (perTxUnits === BigInt(0)) throw new Error('Per-payment limit must be greater than zero');
      if (perTxUnits > dailyUnits) throw new Error('Per-payment limit cannot exceed the daily limit');

      const vault = deriveVaultPDA(publicKey, agentKey, mintKey);
      if (await connection.getAccountInfo(vault)) {
        throw new Error('You already have a vault for this agent and token');
      }

      const tx = new Transaction().add(
        createVaultIx(publicKey, agentKey, mintKey, perTxUnits, dailyUnits, allowlist, tokenProgram)
      );
      if (depositUnits > BigInt(0)) {
        const balance = await connection
          .getTokenAccountBalance(deriveVaultTokenAccount(mintKey, publicKey, tokenProgram))
          .catch(() => null);
        if (!balance || BigInt(balance.value.amount) < depositUnits) {
          throw new Error(`Your wallet holds ${balance?.value.uiAmountString ?? '0'} of this token; lower the deposit or fund the wallet`);
        }
        tx.add(depositIx(publicKey, vault, mintKey, depositUnits, decimals, tokenProgram));
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      onCreated?.({
        signature, vault, agent: agentKey, mint: mintKey,
        deposit: deposit.trim() || '0', perTxLimit: perTx.trim(), dailyLimit: daily.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!fixedAgent && (
        <TruvaInput label="AGENT_KEY" placeholder="Agent's Solana address" value={agent} onChange={(e) => setAgent(e.target.value)} />
      )}
      <TruvaInput label="TOKEN_MINT (DEFAULT: DEVNET USDC)" value={mint} onChange={(e) => setMint(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TruvaInput label="PER_PAYMENT_LIMIT" placeholder="1" value={perTx} onChange={(e) => setPerTx(e.target.value)} />
        <TruvaInput label="DAILY_LIMIT" placeholder="10" value={daily} onChange={(e) => setDaily(e.target.value)} />
        <TruvaInput label="DEPOSIT (OPTIONAL)" placeholder="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
      </div>
      <TruvaInput
        label={`ALLOWED_RECIPIENTS (OPTIONAL, MAX ${MAX_ALLOWLIST})`}
        placeholder="Comma-separated addresses. Empty = any recipient"
        value={recipients}
        onChange={(e) => setRecipients(e.target.value)}
      />
      <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
        The agent can only spend through the program, inside these limits. You can pause the vault, change the
        limits or withdraw the balance at any time.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {publicKey ? (
          <TruvaButton variant="primary" className="text-[12px]" disabled={busy} onClick={submit}>
            {busy ? 'SIGNING_TRANSACTION...' : submitLabel}
          </TruvaButton>
        ) : (
          <WalletConnectButton />
        )}
      </div>
      {error && <p className="text-[12px] text-red-400 font-mono break-words">{error}</p>}
    </div>
  );
}
