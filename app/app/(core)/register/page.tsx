'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { TruvaButton, TruvaInput, TruvaProgressBar, TruvaCheckTag } from '@/components/ui/truva';
import { WalletConnectButton } from '@/components/shared/WalletConnectButton';
import { CheckCircle, Circle, Shield, Wallet, ExternalLink, Loader2 } from 'lucide-react';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

const steps = ['IDENTITY', 'CONFIGURATION', 'VERIFICATION'];
const categories = ['FINANCIAL_ARBITRAGE', 'DATA_ORACLE', 'SECURITY_MONITOR', 'TRADING_BOT', 'LIQUIDITY_PROVISION', 'CROSS_CHAIN_BRIDGE'];
const capabilities = ['SWAP_EXECUTION', 'CROSS_CHAIN_BRIDGE', 'ARBITRAGE_DETECTION', 'LP_MANAGEMENT', 'ORACLE_READING', 'RISK_ASSESSMENT', 'DATA_FEED', 'COMPLIANCE_AUDIT'];
const CHAINS = ['solana', 'ethereum', 'base', 'arbitrum'] as const;

const CATEGORY_TO_TASK: Record<string, string> = {
  FINANCIAL_ARBITRAGE: 'trading',
  DATA_ORACLE: 'data',
  SECURITY_MONITOR: 'monitoring',
  TRADING_BOT: 'trading',
  LIQUIDITY_PROVISION: 'yield',
  CROSS_CHAIN_BRIDGE: 'execution',
} as const;

const VALID_TASK_TYPES = ['trading', 'yield', 'data', 'execution', 'risk', 'treasury', 'monitoring', 'payment'] as const;
type TaskType = typeof VALID_TASK_TYPES[number];

function toTaskType(val: string): TaskType {
  return VALID_TASK_TYPES.includes(val as TaskType) ? (val as TaskType) : 'trading';
}

const RISK_TO_SPENDING: Record<string, string> = {
  LOW: 'conservative',
  MEDIUM: 'standard',
  HIGH: 'aggressive',
};

/* SSR-safe wrapper — prevents WalletContext error during static generation */
function RegisterPageInner() {
  const { publicKey: walletPubkey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [walletKey, setWalletKey] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState('LOW');

  const [selectedChains, setSelectedChains] = useState<string[]>(['solana']);
  const [stakeAmount, setStakeAmount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [agentId, setAgentId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (walletPubkey) setWalletKey(walletPubkey.toBase58());
  }, [walletPubkey]);

  const toggleCap = (c: string) => {
    setSelectedCaps((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const toggleChain = (c: string) => {
    setSelectedChains((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const handleSubmit = useCallback(async () => {
    if (!walletPubkey || !connected) {
      setSubmitError('CONNECT_PHANTOM_WALLET_FIRST');
      return;
    }
    if (!name || !operatorName || !operatorEmail || selectedChains.length === 0) {
      setSubmitError('FILL_ALL_REQUIRED_FIELDS');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitPhase('SIGNING_MEMO_TRANSACTION...');

    try {
      const memo = JSON.stringify({
        p: 'TRUVA',
        op: 'register',
        name,
        cat: toTaskType(CATEGORY_TO_TASK[category] || 'trading'),
        ts: Date.now(),
      });

      const instruction = new TransactionInstruction({
        keys: [{ pubkey: walletPubkey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf-8'),
      });

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);

      setSubmitPhase('CONFIRMING_ON_CHAIN...');
      await connection.confirmTransaction(signature, 'confirmed');
      setTxSignature(signature);

      setSubmitPhase('REGISTERING_IN_PROTOCOL...');
      const body = {
        name,
        public_key: walletPubkey.toBase58(),
        operator_name: operatorName,
        operator_email: operatorEmail,
        task_type: toTaskType(CATEGORY_TO_TASK[category] || 'trading'),
        description: description || undefined,
        max_tx_size: 1000,
        rate_limit: 100,
        chains: selectedChains,
        spending_behavior: RISK_TO_SPENDING[riskTolerance],
        metadata: JSON.stringify({
          capabilities: selectedCaps,
          stake_amount: stakeAmount,
          tx_signature: signature,
          category,
        }),
        tx_signature: signature,
      };

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409 || err.error === 'WALLET_ALREADY_REGISTERED') {
          throw new Error('WALLET_ALREADY_REGISTERED — THIS_PUBLIC_KEY_IS_ALREADY_IN_THE_REGISTRY');
        }
        throw new Error(err.error || 'REGISTRATION_FAILED');
      }

      const result = await res.json();
      setAgentId(result.data?.id || '');
      setSubmitted(true);
      setSubmitPhase('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'UNEXPECTED_ERROR';
      if (message.includes('User rejected')) {
        setSubmitError('TRANSACTION_REJECTED_BY_WALLET');
      } else if (message.includes('nsufficient')) {
        setSubmitError('INSUFFICIENT_SOL — AIRDROP_DEVNET_SOL_FIRST');
      } else {
        setSubmitError(message);
      }
      setSubmitPhase('');
    } finally {
      setSubmitting(false);
    }
  }, [walletPubkey, connected, name, operatorName, operatorEmail, category, description, selectedChains, riskTolerance, selectedCaps, stakeAmount, sendTransaction, connection]);

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle size={48} className="text-[var(--accent-green)] mx-auto" />
          <h2 className="text-[18px] font-bold">AGENT_REGISTERED</h2>
          <p className="text-[13px] text-[var(--text-secondary)] uppercase tracking-[1px]">
            ON-CHAIN CONFIRMATION COMPLETE
          </p>
          <div className="bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px] p-4 space-y-2 text-left">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-muted)]">AGENT</span>
              <span className="text-[var(--text-primary)] font-bold">{name}</span>
            </div>
            {agentId && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-muted)]">ID</span>
                <span className="text-[var(--text-primary)] font-mono text-[13px]">{agentId}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--text-muted)]">TX</span>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[var(--accent-green)] hover:underline text-[13px] font-mono"
              >
                {txSignature.slice(0, 20)}...
                <ExternalLink size={10} />
              </a>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <TruvaButton variant="primary" className="text-[12px] flex-1" onClick={() => window.location.href = '/registry'}>
              VIEW_REGISTRY
            </TruvaButton>
            <TruvaButton variant="ghost" className="text-[12px] flex-1" onClick={() => { setSubmitted(false); setStep(0); setName(''); setDescription(''); setTxSignature(''); }}>
              REGISTER_ANOTHER
            </TruvaButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold">REGISTER_AGENT</h1>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">ONBOARDING_WIZARD · 3-STEP VALIDATION</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border text-[13px] uppercase tracking-[2px] ${
              i < step ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]' :
              i === step ? 'border-[var(--accent-green)] text-[var(--accent-green)]' :
              'border-[var(--border-default)] text-[var(--text-muted)]'
            }`}>
              {i < step ? <CheckCircle size={12} /> : <Circle size={12} />}
              <span>STEP_{i + 1}: {s}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-[var(--border-default)]" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* Form */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-6">
          {step === 0 && (
            <div className="space-y-5">
              <h3 className="text-[13px] font-bold mb-4">IDENTITY_CONFIGURATION</h3>

              {/* Wallet Connection */}
              <div className="p-4 bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px]">
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">WALLET_CONNECTION</label>
                <div className="flex items-center gap-3">
                  <WalletConnectButton />
                  {connected && (
                    <div className="flex items-center gap-1.5">
                      <Wallet size={12} className="text-[var(--accent-green)]" />
                      <span className="text-[13px] text-[var(--accent-green)] uppercase tracking-[1px]">CONNECTED</span>
                    </div>
                  )}
                </div>
                {!connected && (
                  <p className="text-[12px] text-[var(--text-muted)] mt-2 uppercase tracking-[1px]">
                    CONNECT PHANTOM OR SOLFLARE TO AUTO-FILL PUBLIC KEY
                  </p>
                )}
              </div>

              <TruvaInput label="AGENT_ENTITY_NAME" placeholder="e.g. ALPHA_LIQUIDITY_BOT" value={name} onChange={(e) => setName(e.target.value)} />

              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">PUBLIC_KEY [ED25519]</label>
                <input
                  value={walletKey}
                  onChange={(e) => !connected && setWalletKey(e.target.value)}
                  readOnly={connected}
                  placeholder="Connect wallet or paste Solana address..."
                  className={`w-full bg-[var(--bg-input)] border rounded-[2px] px-3 py-2.5 text-[13px] font-mono focus:outline-none ${connected ? 'text-[var(--accent-green)] border-[var(--accent-green)] bg-[var(--accent-green-dim)] cursor-not-allowed' : 'border-[var(--border-default)] text-[var(--text-primary)] focus:border-[var(--accent-green)]'}`}
                />
                {connected && <p className="text-[12px] text-[var(--accent-green)] mt-1 uppercase tracking-[1px]">AUTO-FILLED_FROM_WALLET</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TruvaInput label="OPERATOR_NAME" placeholder="e.g. John Doe" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} />
                <TruvaInput label="OPERATOR_EMAIL" placeholder="operator@truva.io" value={operatorEmail} onChange={(e) => setOperatorEmail(e.target.value)} />
              </div>

              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">DEPLOYMENT_CATEGORY</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-2.5 text-[13px] text-[var(--text-primary)] font-mono focus:border-[var(--accent-green)] focus:outline-none appearance-none cursor-pointer">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">DESCRIPTION</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the agent's intended operations..."
                  rows={3}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-[2px] px-3 py-2.5 text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-dim)] focus:border-[var(--accent-green)] focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-[13px] font-bold mb-4">OPERATIONAL_PARAMETERS</h3>
              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">DECLARED_CAPABILITIES</label>
                <div className="flex flex-wrap gap-2">
                  {capabilities.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCap(c)}
                      className={`px-3 py-1.5 text-[13px] uppercase tracking-[1px] rounded-[2px] border transition-colors ${
                        selectedCaps.includes(c)
                          ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">RISK_TOLERANCE</label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRiskTolerance(r)}
                      className={`flex-1 py-2 text-[13px] uppercase tracking-[2px] rounded-[2px] border transition-colors ${
                        riskTolerance === r
                          ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)]">SUPPORTED_CHAINS</label>
                <div className="flex flex-wrap gap-2">
                  {CHAINS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleChain(c)}
                      className={`px-3 py-1.5 text-[13px] uppercase tracking-[1px] rounded-[2px] border transition-colors ${
                        selectedChains.includes(c)
                          ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <TruvaInput label="STAKE_AMOUNT (TRU)" placeholder="e.g. 50000" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-[13px] font-bold mb-4">VERIFICATION_SUMMARY</h3>
              <div className="bg-[var(--bg-terminal)] border border-[var(--border-default)] rounded-[2px] p-4 space-y-2">
                {[
                  { label: 'ENTITY_NAME', value: name || '—' },
                  { label: 'PUBLIC_KEY', value: walletKey || '—' },
                  { label: 'OPERATOR', value: operatorName || '—' },
                  { label: 'EMAIL', value: operatorEmail || '—' },
                  { label: 'CATEGORY', value: category },
                  { label: 'CAPABILITIES', value: selectedCaps.join(', ') || '—' },
                  { label: 'RISK_TOLERANCE', value: riskTolerance },

                  { label: 'CHAINS', value: selectedChains.join(', ').toUpperCase() || '—' },
                  { label: 'STAKE', value: stakeAmount ? `${stakeAmount} TRU` : '—' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-[13px]">
                    <span className="text-[var(--text-muted)]">{item.label}</span>
                    <span className="text-[var(--text-primary)] font-bold">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Wallet Status */}
              <div className={`p-3 rounded-[2px] border ${connected ? 'bg-[var(--accent-green-dim)] border-[var(--accent-green)]' : 'bg-[rgba(255,0,0,0.05)] border-[#ff4444]'}`}>
                <div className="flex items-center gap-2">
                  <Wallet size={14} className={connected ? 'text-[var(--accent-green)]' : 'text-[#ff4444]'} />
                  <p className={`text-[13px] uppercase tracking-[1px] ${connected ? 'text-[var(--accent-green)]' : 'text-[#ff4444]'}`}>
                    {connected ? 'WALLET_CONNECTED — READY_TO_SIGN_ON-CHAIN_TRANSACTION' : 'WALLET_NOT_CONNECTED — GO BACK TO STEP 1 AND CONNECT PHANTOM'}
                  </p>
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-[rgba(255,0,0,0.05)] border border-[#ff4444] rounded-[2px]">
                  <p className="text-[13px] uppercase tracking-[1px] text-[#ff4444]">{submitError}</p>
                </div>
              )}

              <div className="p-3 bg-[var(--accent-green-dim)] border border-[var(--accent-green)] rounded-[2px]">
                <p className="text-[13px] uppercase tracking-[1px] text-[var(--accent-green)]">
                  SUBMITTING WILL SIGN A MEMO TRANSACTION ON SOLANA AND REGISTER YOUR AGENT IN THE TRUVA PROTOCOL.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border-default)]">
            <TruvaButton
              variant="ghost"
              className="text-[12px]"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              PREVIOUS_STEP
            </TruvaButton>
            {step < 2 ? (
              <TruvaButton variant="primary" className="text-[12px]" onClick={() => setStep(step + 1)}>
                CONTINUE
              </TruvaButton>
            ) : (
              <TruvaButton
                variant="primary"
                className="text-[12px]"
                onClick={handleSubmit}
                disabled={submitting || !connected}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    {submitPhase}
                  </span>
                ) : (
                  'SUBMIT_ON_CHAIN'
                )}
              </TruvaButton>
            )}
          </div>
        </div>

        {/* Preview panel */}
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <h4 className="text-[13px] uppercase tracking-[2px] font-bold mb-4">LIVE_PREVIEW</h4>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center">
                <Shield size={18} className="text-[var(--text-muted)]" />
              </div>
              <div>
                <div className="text-[13px] font-bold">{name || 'AGENT_NAME'}</div>
                <div className="text-[12px] text-[var(--text-muted)]">{walletKey ? walletKey.substring(0, 12) + '...' : '0x...'}</div>
              </div>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">CATEGORY</span>
                <span className="text-[var(--text-primary)]">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">TIER</span>
                <span className="text-[var(--text-muted)]">SANDBOX_ACCESS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">STATUS</span>
                <span className="text-[var(--amber)]">PENDING</span>
              </div>
            </div>
            {selectedCaps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)] mb-2">CAPABILITIES</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCaps.map((c) => <TruvaCheckTag key={c} label={c} />)}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
            <h4 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">REGISTRATION_PROGRESS</h4>
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  {i <= step
                    ? <CheckCircle size={14} className="text-[var(--accent-green)]" />
                    : <Circle size={14} className="text-[var(--text-dim)]" />
                  }
                  <span className={`text-[13px] uppercase tracking-[1px] ${i <= step ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <TruvaProgressBar value={((step + 1) / steps.length) * 100} className="mt-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Default export — lazy-loads the inner component to avoid SSR WalletContext errors */
export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[13px] font-mono text-zinc-500 tracking-widest animate-pulse">INITIALIZING_WALLET_CONTEXT...</div>
      </div>
    );
  }

  return <RegisterPageInner />;
}
