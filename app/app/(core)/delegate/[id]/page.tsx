'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TruvaButton, TruvaStatusPill, TruvaBadge, TruvaProgressBar, TruvaInput } from '@/components/ui/truva';
import { WalletConnectButton } from '@/components/shared/WalletConnectButton';
import { CreateVaultForm, type CreatedVault } from '@/components/vaults/CreateVaultForm';
import { Shield, ArrowLeft, Zap, Wallet } from 'lucide-react';
import { signRecordDelegationMessage } from '@/lib/auth/signDelegationMessage';
import type { Agent } from '@/backend/types/agent';

const TIER_BADGE: Record<number, 'bronze' | 'silver' | 'gold'> = {
  1: 'bronze',
  2: 'silver',
  3: 'gold',
};

const DURATIONS = ['7_DAYS', '30_DAYS', '90_DAYS', 'INDEFINITE'];

const explorer = (kind: 'address' | 'tx', id: string) =>
  `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

function isSolanaAddress(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export default function DelegatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { publicKey, connected, signMessage } = useWallet();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [vault, setVault] = useState<CreatedVault | null>(null);

  // Xi Trade runs as a separate app: it takes a delegation intent, not a vault
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30_DAYS');
  const [cap, setCap] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const [xiDone, setXiDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAgent(res.data);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [id]);

  // Best-effort: the API only accepts a record signed by the wallet, so this asks
  // for a message signature. A wallet that cannot sign messages, a rejected prompt
  // or a failed request is logged and never blocks the caller's flow.
  const recordDelegation = async (fields: { amount: number; cap: number; duration: string; txSig?: string }) => {
    if (!publicKey || !agent) return;
    try {
      const auth = await signRecordDelegationMessage(signMessage, {
        agentId: id,
        wallet: publicKey.toBase58(),
        txSig: fields.txSig ?? null,
      });
      const res = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: auth.wallet,
          signature: auth.signature,
          timestamp: auth.timestamp,
          agent_id: id,
          agent_name: agent.name,
          amount_sol: fields.amount,
          cap_usd: fields.cap,
          duration: fields.duration,
          tx_sig: fields.txSig ?? null,
        }),
      });
      if (!res.ok) console.error('Failed to record delegation: HTTP', res.status);
    } catch (e) {
      console.error('Failed to record delegation:', e);
    }
  };

  const isXiAgent = !!agent && agent.name.toLowerCase().includes('xi');
  const hasValidKey = !!agent && isSolanaAddress(agent.public_key);

  const xiRedirectUrl = () =>
    `https://xi-agent-eight.vercel.app/?delegated=${amount}&from=${publicKey?.toBase58() ?? ''}&cap=${cap}&duration=${duration}`;

  const handleXiDelegate = async () => {
    if (!amount || !connected || !publicKey || !agent) return;
    setSubmitting(true);
    await recordDelegation({ amount: parseFloat(amount), cap: parseFloat(cap), duration });
    setSubmitting(false);
    setXiDone(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[13px] font-mono text-zinc-500 tracking-widest animate-pulse">LOADING_AGENT...</div>
      </div>
    );
  }

  if (vault) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="w-16 h-16 bg-[var(--accent-green-dim)] border border-[var(--accent-green)] rounded-[2px] flex items-center justify-center">
          <Zap size={32} className="text-[var(--accent-green)]" />
        </div>
        <div className="text-center">
          <div className="text-[18px] font-bold tracking-widest mb-2">VAULT_CREATED</div>
          <div className="text-[13px] text-[var(--text-secondary)] tracking-wider">
            <span className="text-[var(--accent-green)]">{agent?.name ?? id}</span> can now spend up to{' '}
            {vault.perTxLimit} per payment and {vault.dailyLimit} per day.
          </div>
          <div className="text-[12px] text-[var(--text-muted)] mt-2">
            Deposited: {vault.deposit} · You can pause it or withdraw at any time
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <a href={explorer('tx', vault.signature)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--accent-green)] underline font-mono">
              VIEW TX ON EXPLORER ↗
            </a>
            <a href={explorer('address', vault.vault.toBase58())} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--accent-green)] underline font-mono">
              VIEW VAULT ↗
            </a>
          </div>
        </div>
        <div className="flex gap-4">
          <TruvaButton variant="ghost" className="text-[12px]" onClick={() => router.push('/registry')}>
            BACK_TO_REGISTRY
          </TruvaButton>
          <TruvaButton variant="primary" className="text-[12px]" onClick={() => router.push('/vaults')}>
            MANAGE_VAULT
          </TruvaButton>
        </div>
      </div>
    );
  }

  if (xiDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="w-16 h-16 bg-[var(--accent-green-dim)] border border-[var(--accent-green)] rounded-[2px] flex items-center justify-center">
          <Zap size={32} className="text-[var(--accent-green)]" />
        </div>
        <div className="text-center">
          <div className="text-[18px] font-bold tracking-widest mb-2">DELEGATION_RECORDED</div>
          <div className="text-[13px] text-[var(--text-secondary)] tracking-wider">
            {amount} SOL for <span className="text-[var(--accent-green)]">{agent?.name ?? id}</span>,{' '}
            {duration.replace(/_/g, ' ')}.
          </div>
          <div className="mt-3 text-[12px] text-blue-400">Click below to launch the Xi Trade agent</div>
        </div>
        <div className="flex gap-4">
          <TruvaButton variant="ghost" className="text-[12px]" onClick={() => router.push('/registry')}>
            BACK_TO_REGISTRY
          </TruvaButton>
          <TruvaButton
            variant="primary"
            className="text-[12px] bg-blue-600 border-blue-600"
            onClick={() => { window.location.href = xiRedirectUrl(); }}
          >
            LAUNCH XI TRADE ↗
          </TruvaButton>
        </div>
      </div>
    );
  }

  const tierLabel = agent ? (TIER_BADGE[agent.tier] ?? 'bronze') : 'bronze';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[12px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        BACK
      </button>

      {/* Agent Header */}
      {agent && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center shrink-0">
              <Shield size={20} className="text-[var(--accent-green)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[18px] font-bold">{agent.name}</span>
                <TruvaBadge variant={tierLabel} />
                <TruvaStatusPill variant={agent.status === 'active' ? 'active' : 'standby'} />
              </div>
              <div className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)] mt-1">
                TRUST: {agent.trust_score}/100 · {agent.task_type.toUpperCase()} · {agent.chains.join(', ').toUpperCase()}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <TruvaProgressBar value={agent.trust_score} color="var(--accent-green)" />
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6 space-y-6">
        <h2 className="text-[14px] uppercase tracking-[3px] font-bold border-b border-[var(--border-subtle)] pb-3">
          {isXiAgent ? 'CONFIGURE_DELEGATION' : 'FUND_A_SPENDING_VAULT'}
        </h2>

        {/* Wallet Connection */}
        <div className={`p-4 border rounded-[2px] ${connected ? 'bg-[var(--accent-green-dim)] border-[var(--accent-green)]' : 'bg-[var(--bg-terminal)] border-[var(--border-default)]'}`}>
          <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">WALLET_CONNECTION</label>
          <div className="flex items-center gap-3">
            <WalletConnectButton />
            {connected && publicKey && (
              <div className="flex items-center gap-1.5">
                <Wallet size={12} className="text-[var(--accent-green)]" />
                <span className="text-[12px] font-mono text-[var(--accent-green)]">
                  {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-6)}
                </span>
              </div>
            )}
          </div>
          {!connected && (
            <p className="text-[12px] text-[var(--text-muted)] mt-2 uppercase tracking-[1px]">
              CONNECT PHANTOM OR SOLFLARE (DEVNET) TO CONTINUE
            </p>
          )}
        </div>

        {!agent ? (
          <p className="text-[13px] text-[var(--text-secondary)]">Agent not found.</p>
        ) : isXiAgent ? (
          <>
            <TruvaInput
              label="DELEGATION_AMOUNT (SOL)"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div>
              <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">
                DURATION
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 text-[13px] uppercase tracking-[1px] rounded-[2px] border transition-colors ${duration === d
                        ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                      }`}
                  >
                    {d.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <TruvaInput
              label="SPENDING_CAP / TX (USD)"
              placeholder="e.g. 1000"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
            />
            <TruvaButton
              variant="primary"
              className="w-full text-[13px]"
              onClick={handleXiDelegate}
              disabled={!amount || !connected || submitting}
            >
              {!connected ? 'CONNECT_WALLET_TO_DELEGATE' : submitting ? 'RECORDING...' : 'CONFIRM_DELEGATION'}
            </TruvaButton>
          </>
        ) : !hasValidKey ? (
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            This agent is registered without a valid Solana key, so a vault cannot be created for it.
          </p>
        ) : (
          <>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Your funds stay in a vault you own. The agent never holds them: it can only pay from the vault
              through the Truva program, inside the limits you set here.
            </p>
            <CreateVaultForm
              agent={agent.public_key}
              submitLabel="CREATE_AND_FUND_VAULT"
              onCreated={(created) => {
                // The vault already exists on-chain: show the result first, then
                // record it in the background so a pending or rejected signature
                // prompt can never hold the result back.
                setVault(created);
                void recordDelegation({
                  amount: parseFloat(created.deposit) || 0,
                  cap: parseFloat(created.perTxLimit) || 0,
                  duration: 'VAULT',
                  txSig: created.signature,
                });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
