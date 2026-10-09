'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, type ConfirmedSignatureInfo } from '@solana/web3.js';
import { Vault, Lock, PauseCircle, PlayCircle, Plus, RefreshCw, ShieldAlert, Wallet, X } from 'lucide-react';
import {
  TruvaBadge, TruvaButton, TruvaInput, TruvaProgressBar, TruvaStatCard, TruvaStatusPill,
} from '@/components/ui/truva';
import { WalletConnectButton } from '@/components/shared/WalletConnectButton';
import { CreateVaultForm } from '@/components/vaults/CreateVaultForm';
import { TRUSTGATE_PROGRAM_ID, getPassportPDA } from '@/lib/solana';
import {
  TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, VAULT_ACCOUNT_SIZE, VAULT_OWNER_OFFSET, depositIx, deriveScoreRecordPDA,
  parseScoreRecordAccount, deriveVaultTokenAccount, formatUnits, parsePassportAccount,
  parseUnits, parseVaultAccount, setVaultPausedIx, simulateVaultPayment, spentToday, tokenSymbol,
  updateVaultLimitsIx, withdrawIx,
  type PassportData, type PaymentVerdict, type ScoreRecordData, type VaultData,
} from '@/lib/solana/vault';

const MAX_VAULTS = 12;
const RECENT_TX = 5;

interface VaultView {
  address: PublicKey;
  data: VaultData;
  passport: PassportData | null;
  /** Where the agent's score came from; null when it was written without provenance */
  scoreRecord: ScoreRecordData | null;
  /** SPL Token or Token-2022, whichever owns the mint */
  tokenProgram: PublicKey;
  balance: bigint;
  decimals: number;
  recent: ConfirmedSignatureInfo[];
}

const short = (key: PublicKey | string) => {
  const s = typeof key === 'string' ? key : key.toBase58();
  return `${s.slice(0, 6)}...${s.slice(-6)}`;
};

const explorer = (kind: 'address' | 'tx', id: string) =>
  `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

function ExplorerLink({ kind, id, children }: { kind: 'address' | 'tx'; id: string; children: React.ReactNode }) {
  return (
    <a
      href={explorer(kind, id)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[var(--text-primary)] hover:text-[var(--accent-green)] transition-colors"
    >
      {children}
    </a>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="text-[var(--text-muted)] uppercase tracking-[1px] shrink-0">{label}</span>
      <span className="text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

export default function VaultsPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [vaults, setVaults] = useState<VaultView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdSig, setCreatedSig] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ({ dataSize: number } | { memcmp: { offset: number; bytes: string } })[] = [
        { dataSize: VAULT_ACCOUNT_SIZE },
      ];
      if (onlyMine && publicKey) {
        filters.push({ memcmp: { offset: VAULT_OWNER_OFFSET, bytes: publicKey.toBase58() } });
      }
      const accounts = await connection.getProgramAccounts(TRUSTGATE_PROGRAM_ID, { filters });
      const parsed = accounts.slice(0, MAX_VAULTS).map((a) => ({
        address: a.pubkey,
        data: parseVaultAccount(a.account.data),
      }));

      // Per vault: the agent's passport, its score record, and the mint (to learn its token program)
      const related = await connection.getMultipleAccountsInfo(parsed.flatMap((v) => [
        getPassportPDA(v.data.agent)[0],
        deriveScoreRecordPDA(v.data.agent),
        v.data.mint,
      ]));

      const views = await Promise.all(parsed.map(async (v, i): Promise<VaultView> => {
        const [passport, record, mint] = related.slice(i * 3, i * 3 + 3);
        const tokenProgram = mint?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        const [balance, recent] = await Promise.all([
          connection.getTokenAccountBalance(deriveVaultTokenAccount(v.data.mint, v.address, tokenProgram)),
          connection.getSignaturesForAddress(v.address, { limit: RECENT_TX }),
        ]);
        return {
          ...v,
          tokenProgram,
          passport: passport ? parsePassportAccount(passport.data) : null,
          scoreRecord: record ? parseScoreRecordAccount(record.data) : null,
          balance: BigInt(balance.value.amount),
          decimals: balance.value.decimals,
          recent,
        };
      }));

      setVaults(views);
      setNow(Math.floor(Date.now() / 1000));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vaults');
    } finally {
      setLoading(false);
    }
  }, [connection, onlyMine, publicKey]);

  useEffect(() => { load(); }, [load]);

  const pausedCount = useMemo(() => vaults.filter((v) => v.data.paused).length, [vaults]);
  const frozenCount = useMemo(() => vaults.filter((v) => v.passport?.frozen).length, [vaults]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold">AGENT_VAULTS</h1>
            <TruvaStatusPill variant="live" label="DEVNET" />
          </div>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">
            OWNER-FUNDED SPENDING ACCOUNTS · LIMITS ENFORCED ON-CHAIN
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TruvaButton variant="primary" className="text-[12px]" onClick={() => setCreating((c) => !c)}>
            {creating ? <X size={12} /> : <Plus size={12} />} {creating ? 'CLOSE' : 'NEW_VAULT'}
          </TruvaButton>
          <TruvaButton variant="outlined" className="text-[12px]" onClick={load} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> REFRESH
          </TruvaButton>
          <WalletConnectButton />
        </div>
      </div>

      {creating && (
        <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-6 mb-6">
          <h2 className="text-[14px] uppercase tracking-[3px] font-bold border-b border-[var(--border-subtle)] pb-3 mb-4">
            CREATE_AGENT_VAULT
          </h2>
          <CreateVaultForm
            onCreated={(created) => {
              setCreatedSig(created.signature);
              setCreating(false);
              load();
            }}
          />
        </div>
      )}

      {createdSig && (
        <div className="bg-[var(--bg-card)] border border-[var(--accent-green)] rounded-[2px] p-4 mb-6 text-[13px] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[var(--accent-green)] font-bold tracking-widest">VAULT_CREATED</span>
          <a href={explorer('tx', createdSig)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--accent-green)] underline font-mono">
            VIEW TX ON EXPLORER ↗
          </a>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TruvaStatCard label="VAULTS" value={loading ? 'LOADING' : vaults.length.toString()} sub="ON PROGRAM" icon={<Vault size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="ACTIVE" value={loading ? 'LOADING' : (vaults.length - pausedCount).toString()} sub="ACCEPTING PAYMENTS" icon={<PlayCircle size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard label="PAUSED" value={loading ? 'LOADING' : pausedCount.toString()} sub="OWNER KILL SWITCH" icon={<PauseCircle size={16} className="text-[var(--red)]" />} />
        <TruvaStatCard label="FROZEN_AGENTS" value={loading ? 'LOADING' : frozenCount.toString()} sub="PASSPORT FROZEN" icon={<ShieldAlert size={16} className="text-[var(--red)]" />} />
      </div>

      <div className="flex gap-1 mb-4">
        {[
          { label: 'ALL_VAULTS', mine: false },
          { label: 'MY_VAULTS', mine: true },
        ].map((f) => (
          <button
            key={f.label}
            onClick={() => setOnlyMine(f.mine)}
            disabled={f.mine && !publicKey}
            title={f.mine && !publicKey ? 'Connect a wallet to filter by owner' : undefined}
            className={`px-3 py-1.5 text-[12px] uppercase tracking-[2px] rounded-[2px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              onlyMine === f.mine
                ? 'border-[var(--accent-green)] text-[var(--accent-green)] bg-[var(--accent-green-dim)]'
                : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-[var(--bg-card)] border border-[var(--red)] rounded-[2px] p-4 mb-4 text-[13px] text-[var(--red)] font-mono">
          {error}
        </div>
      )}

      {loading && vaults.length === 0 && (
        <div className="text-[13px] font-mono text-[var(--text-muted)] tracking-widest animate-pulse py-16 text-center">
          LOADING_VAULTS...
        </div>
      )}

      {!loading && !error && vaults.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-10 text-center">
          <div className="text-[14px] font-bold tracking-widest mb-2">NO_VAULTS_FOUND</div>
          <div className="text-[13px] text-[var(--text-secondary)]">
            {onlyMine ? 'The connected wallet does not own a vault.' : 'No vault has been created on this program yet.'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {vaults.map((v) => (
          <VaultCard
            key={v.address.toBase58()}
            vault={v}
            now={now}
            isOwner={!!publicKey && publicKey.equals(v.data.owner)}
            onSend={async (tx) => {
              const sig = await sendTransaction(tx, connection);
              await connection.confirmTransaction(sig, 'confirmed');
              await load();
              return sig;
            }}
          />
        ))}
      </div>
    </div>
  );
}

function VaultCard({ vault, now, isOwner, onSend }: {
  vault: VaultView;
  now: number;
  isOwner: boolean;
  onSend: (tx: Transaction) => Promise<string>;
}) {
  const { data, passport, scoreRecord, tokenProgram, balance, decimals, recent } = vault;
  const { connection } = useConnection();
  const symbol = tokenSymbol(data.mint);
  const fmt = (amount: bigint) => formatUnits(amount, decimals) + (symbol ? ` ${symbol}` : '');
  const plain = (amount: bigint) => formatUnits(amount, decimals);

  const [editing, setEditing] = useState(false);
  const [perTx, setPerTx] = useState(plain(data.perTxLimit));
  const [daily, setDaily] = useState(plain(data.dailyLimit));
  const [funds, setFunds] = useState('');

  // "Would this payment go through?" — simulated against the live program
  const [payAmount, setPayAmount] = useState(plain(data.perTxLimit));
  const [payTo, setPayTo] = useState(data.allowlist[0]?.toBase58() ?? '');
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<PaymentVerdict | null>(null);

  const checkPayment = async () => {
    setVerdict(null);
    const amount = parseUnits(payAmount, decimals);
    let recipient: PublicKey;
    try {
      recipient = new PublicKey(payTo.trim());
    } catch {
      setVerdict({ allowed: false, code: 'InvalidRecipient', reason: 'Recipient is not a valid Solana address.' });
      return;
    }
    if (amount === null) {
      setVerdict({ allowed: false, code: 'InvalidAmount', reason: 'Enter the amount as a number, e.g. 1.50' });
      return;
    }
    setChecking(true);
    try {
      setVerdict(await simulateVaultPayment(connection, data, recipient, amount, tokenProgram));
    } catch (e) {
      setVerdict({ allowed: false, code: 'SimulationFailed', reason: e instanceof Error ? e.message : 'Simulation failed' });
    } finally {
      setChecking(false);
    }
  };

  const moveFunds = (direction: 'deposit' | 'withdraw') => {
    const amount = parseUnits(funds, decimals);
    if (amount === null || amount === BigInt(0)) {
      setTxError('Enter the amount as a number, e.g. 5');
      return;
    }
    run(() => new Transaction().add(
      direction === 'deposit'
        ? depositIx(data.owner, vault.address, data.mint, amount, decimals, tokenProgram)
        : withdrawIx(data, amount, tokenProgram)
    ));
  };
  const [busy, setBusy] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

  const spent = spentToday(data, now);
  const spentPct = data.dailyLimit > BigInt(0) ? Number((spent * BigInt(100)) / data.dailyLimit) : 0;
  const tier = passport ? (passport.tier.toLowerCase() as 'bronze' | 'silver' | 'gold') : null;

  const run = async (build: () => Transaction) => {
    setBusy(true);
    setTxError(null);
    try {
      setLastSig(await onSend(build()));
      setEditing(false);
    } catch (e) {
      setTxError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  };

  const saveLimits = () => {
    const perTxUnits = parseUnits(perTx, decimals);
    const dailyUnits = parseUnits(daily, decimals);
    if (perTxUnits === null || dailyUnits === null) {
      setTxError('Enter limits as numbers, e.g. 1.50');
      return;
    }
    if (perTxUnits > dailyUnits) {
      setTxError('Per-payment limit cannot exceed the daily limit');
      return;
    }
    run(() => new Transaction().add(updateVaultLimitsIx(data, perTxUnits, dailyUnits)));
  };

  return (
    <div className={`bg-[var(--bg-card)] border rounded-[2px] p-5 space-y-4 ${data.paused ? 'border-[var(--red)]' : 'border-[var(--border-default)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[2px] flex items-center justify-center shrink-0">
            {data.paused ? <Lock size={18} className="text-[var(--red)]" /> : <Vault size={18} className="text-[var(--accent-green)]" />}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold">
              <ExplorerLink kind="address" id={vault.address.toBase58()}>{short(vault.address)}</ExplorerLink>
            </div>
            <div className="text-[12px] uppercase tracking-[1px] text-[var(--text-muted)] mt-0.5">
              BALANCE: <span className="text-[var(--accent-green)] font-bold">{fmt(balance)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && <TruvaStatusPill variant="synced" label="YOUR VAULT" />}
          <TruvaStatusPill variant={data.paused ? 'blocked' : 'active'} label={data.paused ? 'PAUSED' : 'ACTIVE'} />
        </div>
      </div>

      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px] p-4 space-y-2">
        <Row label="AGENT">
          <span className="inline-flex items-center gap-2">
            <ExplorerLink kind="address" id={data.agent.toBase58()}>{short(data.agent)}</ExplorerLink>
            {tier && <TruvaBadge variant={tier} />}
            {passport?.frozen && <TruvaStatusPill variant="flagged" label="FROZEN" />}
          </span>
        </Row>
        <Row label="TRUST_SCORE">
          <span className="font-bold">{passport ? `${passport.trustScore}/100` : 'NO PASSPORT'}</span>
        </Row>
        {scoreRecord && (
          <Row label="SCORED_BY">
            <span className="inline-flex items-center gap-2">
              <ExplorerLink kind="address" id={scoreRecord.scorer.toBase58()}>{short(scoreRecord.scorer)}</ExplorerLink>
              <span className="text-[var(--text-secondary)]">
                {scoreRecord.votes > 1 ? `${scoreRecord.votes} SCORERS AGREED` : 'SINGLE SCORER'} · MODEL V{scoreRecord.modelVersion}
              </span>
            </span>
          </Row>
        )}
        {scoreRecord && (
          <Row label="SCORE_INPUTS_HASH">
            <span className="font-mono text-[var(--text-secondary)]" title={scoreRecord.inputsHash}>
              {scoreRecord.inputsHash.slice(0, 10)}...{scoreRecord.inputsHash.slice(-10)}
            </span>
          </Row>
        )}
        {scoreRecord?.registryAsset && (
          <Row label="AGENT_REGISTRY_ID">
            <ExplorerLink kind="address" id={scoreRecord.registryAsset.toBase58()}>{short(scoreRecord.registryAsset)}</ExplorerLink>
          </Row>
        )}
        <Row label="OWNER">
          <ExplorerLink kind="address" id={data.owner.toBase58()}>{short(data.owner)}</ExplorerLink>
        </Row>
        <Row label="TOKEN_MINT">
          <span className="inline-flex items-center gap-2">
            <ExplorerLink kind="address" id={data.mint.toBase58()}>{short(data.mint)}</ExplorerLink>
            {tokenProgram.equals(TOKEN_2022_PROGRAM_ID) && <span className="text-[var(--text-secondary)]">TOKEN-2022</span>}
          </span>
        </Row>
        <Row label="ALLOWED_RECIPIENTS">
          {data.allowlist.length === 0 ? (
            <span className="text-[var(--text-secondary)]">ANY</span>
          ) : (
            <span className="inline-flex flex-wrap justify-end gap-x-2">
              {data.allowlist.map((k) => (
                <ExplorerLink key={k.toBase58()} kind="address" id={k.toBase58()}>{short(k)}</ExplorerLink>
              ))}
            </span>
          )}
        </Row>
      </div>

      <div className="space-y-2">
        <Row label="PER_PAYMENT_LIMIT"><span className="font-bold">{fmt(data.perTxLimit)}</span></Row>
        <Row label="SPENT_TODAY">
          <span className="font-bold">{fmt(spent)} / {fmt(data.dailyLimit)}</span>
        </Row>
        <TruvaProgressBar value={spentPct} color={spentPct >= 100 ? 'var(--red)' : 'var(--accent-green)'} />
        <Row label="LIFETIME_PAID"><span className="font-bold">{fmt(data.totalSpent)}</span></Row>
      </div>

      <div>
        <div className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)] mb-2">RECENT_TRANSACTIONS</div>
        {recent.length === 0 ? (
          <div className="text-[12px] text-[var(--text-secondary)]">NONE</div>
        ) : (
          <div className="space-y-1.5">
            {recent.map((tx) => (
              <div key={tx.signature} className="flex items-center justify-between gap-3 text-[12px]">
                <ExplorerLink kind="tx" id={tx.signature}>{short(tx.signature)}</ExplorerLink>
                <span className="text-[var(--text-muted)]">
                  {tx.blockTime ? new Date(tx.blockTime * 1000).toISOString().replace('T', ' ').substring(0, 19) : ''}
                </span>
                <TruvaStatusPill variant={tx.err ? 'rejected' : 'passed'} label={tx.err ? 'FAILED' : 'CONFIRMED'} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[2px] p-4 space-y-3">
        <div>
          <div className="text-[12px] uppercase tracking-[2px] text-[var(--text-muted)]">TEST_A_PAYMENT</div>
          <div className="text-[12px] text-[var(--text-secondary)] mt-1">
            Simulated against the live program. Nothing is signed or sent.
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr_auto] gap-2 items-end">
          <TruvaInput label="AMOUNT" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          <TruvaInput label="RECIPIENT" placeholder="Recipient address" value={payTo} onChange={(e) => setPayTo(e.target.value)} />
          <TruvaButton variant="outlined" className="text-[12px] h-[41px]" disabled={checking} onClick={checkPayment}>
            {checking ? 'CHECKING...' : 'CHECK'}
          </TruvaButton>
        </div>
        {verdict && (
          <div className="flex items-start gap-3 text-[12px]">
            <TruvaStatusPill variant={verdict.allowed ? 'passed' : 'blocked'} label={verdict.allowed ? 'ALLOWED' : 'BLOCKED'} />
            <div className="min-w-0">
              {verdict.code && <div className="font-mono font-bold text-[var(--red)]">{verdict.code}</div>}
              <div className="text-[var(--text-secondary)] break-words">{verdict.reason}</div>
            </div>
          </div>
        )}
      </div>

      {isOwner ? (
        <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <TruvaInput label="DEPOSIT_OR_WITHDRAW" placeholder="Amount" value={funds} onChange={(e) => setFunds(e.target.value)} />
            <TruvaButton variant="outlined" className="text-[12px] h-[41px]" disabled={busy} onClick={() => moveFunds('deposit')}>DEPOSIT</TruvaButton>
            <TruvaButton variant="ghost" className="text-[12px] h-[41px]" disabled={busy} onClick={() => moveFunds('withdraw')}>WITHDRAW</TruvaButton>
          </div>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <TruvaInput label="PER_PAYMENT_LIMIT" value={perTx} onChange={(e) => setPerTx(e.target.value)} />
              <TruvaInput label="DAILY_LIMIT" value={daily} onChange={(e) => setDaily(e.target.value)} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <TruvaButton
              variant={data.paused ? 'primary' : 'danger'}
              className="text-[12px]"
              disabled={busy}
              onClick={() => run(() => new Transaction().add(setVaultPausedIx(data, !data.paused)))}
            >
              {data.paused ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
              {busy ? 'SIGNING...' : data.paused ? 'RESUME_VAULT' : 'PAUSE_VAULT'}
            </TruvaButton>
            {editing ? (
              <>
                <TruvaButton variant="outlined" className="text-[12px]" disabled={busy} onClick={saveLimits}>SAVE_LIMITS</TruvaButton>
                <TruvaButton variant="ghost" className="text-[12px]" disabled={busy} onClick={() => { setEditing(false); setTxError(null); }}>CANCEL</TruvaButton>
              </>
            ) : (
              <TruvaButton variant="ghost" className="text-[12px]" disabled={busy} onClick={() => setEditing(true)}>EDIT_LIMITS</TruvaButton>
            )}
          </div>
          {txError && <p className="text-[12px] text-red-400 font-mono break-words">{txError}</p>}
          {lastSig && (
            <a href={explorer('tx', lastSig)} target="_blank" rel="noopener noreferrer" className="inline-block text-[12px] text-[var(--accent-green)] underline font-mono">
              VIEW TX ON EXPLORER ↗
            </a>
          )}
        </div>
      ) : (
        <div className="border-t border-[var(--border-subtle)] pt-3 flex items-center gap-2 text-[12px] uppercase tracking-[1px] text-[var(--text-muted)]">
          <Wallet size={12} /> CONNECT THE OWNER WALLET TO PAUSE OR CHANGE LIMITS
        </div>
      )}
    </div>
  );
}
