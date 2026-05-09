'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { TruvaButton, TruvaStatusPill, TruvaBadge, TruvaProgressBar, TruvaInput } from '@/components/ui/truva';
import { WalletConnectButton } from '@/components/shared/WalletConnectButton';
import { Shield, ArrowLeft, Zap, Wallet } from 'lucide-react';
import type { Agent } from '@/backend/types/agent';

const TIER_BADGE: Record<number, 'bronze' | 'silver' | 'gold'> = {
  1: 'bronze',
  2: 'silver',
  3: 'gold',
};

const DURATIONS = ['7_DAYS', '30_DAYS', '90_DAYS', 'INDEFINITE'];

export default function DelegatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { publicKey, connected } = useWallet();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30_DAYS');
  const [cap, setCap] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setAgent(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelegate = () => {
    if (!amount || !connected) return;
    setSubmitting(true);
    // Simulate on-chain delegation tx
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 1800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-[13px] font-mono text-zinc-500 tracking-widest animate-pulse">LOADING_AGENT...</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="w-16 h-16 bg-[var(--accent-green-dim)] border border-[var(--accent-green)] rounded-[2px] flex items-center justify-center">
          <Zap size={32} className="text-[var(--accent-green)]" />
        </div>
        <div className="text-center">
          <div className="text-[18px] font-bold tracking-widest mb-2">DELEGATION_CONFIRMED</div>
          <div className="text-[13px] text-[var(--text-secondary)] tracking-wider">
            {amount} SOL delegated to <span className="text-[var(--accent-green)]">{agent?.name ?? id}</span> for {duration.replace(/_/g, ' ')}.
          </div>
        </div>
        <div className="flex gap-4">
          <TruvaButton variant="ghost" className="text-[12px]" onClick={() => router.push('/registry')}>
            BACK_TO_REGISTRY
          </TruvaButton>
          <TruvaButton variant="primary" className="text-[12px]" onClick={() => router.push(`/agents/${id}/control`)}>
            OPEN_CONTROL_PANEL
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

      {/* Delegation Form */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6 space-y-6">
        <h2 className="text-[14px] uppercase tracking-[3px] font-bold border-b border-[var(--border-subtle)] pb-3">
          CONFIGURE_DELEGATION
        </h2>

        {/* Wallet Connection */}
        <div className={`p-4 border rounded-[2px] ${connected ? 'bg-[var(--accent-green-dim)] border-[var(--accent-green)]' : 'bg-[var(--bg-terminal)] border-[var(--border-default)]'}` }>
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
              CONNECT PHANTOM OR SOLFLARE TO SIGN DELEGATION
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <TruvaInput
            label="DELEGATION_AMOUNT (TRU)"
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">
            DURATION
          </label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 text-[13px] uppercase tracking-[1px] rounded-[2px] border transition-colors ${
                  duration === d
                    ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                {d.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Spending Cap */}
        <div>
          <TruvaInput
            label="SPENDING_CAP / TX (USD)"
            placeholder="e.g. 1000"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
          />
        </div>

        {/* Summary */}
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px] p-4 space-y-2">
          <div className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)] mb-3">DELEGATION_SUMMARY</div>
          {[
            { label: 'AGENT', value: agent?.name ?? id },
            { label: 'WALLET', value: connected && publicKey ? `${publicKey.toBase58().slice(0, 8)}...${publicKey.toBase58().slice(-6)}` : 'NOT_CONNECTED' },
            { label: 'AMOUNT', value: amount ? `${amount} SOL` : '—' },
            { label: 'DURATION', value: duration.replace(/_/g, ' ') },
            { label: 'SPENDING_CAP', value: `$${cap} / TX` },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-[13px]">
              <span className="text-[var(--text-muted)]">{item.label}</span>
              <span className="text-[var(--text-primary)] font-bold">{item.value}</span>
            </div>
          ))}
        </div>

        <TruvaButton
          variant="primary"
          className="w-full text-[13px]"
          onClick={handleDelegate}
          disabled={!amount || !connected || submitting}
        >
          {!connected ? 'CONNECT_WALLET_TO_DELEGATE' : submitting ? 'SIGNING_TRANSACTION...' : 'CONFIRM_DELEGATION'}
        </TruvaButton>
      </div>
    </div>
  );
}
