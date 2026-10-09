'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, type ConfirmedSignatureInfo } from '@solana/web3.js';
import { Vault, Lock, PauseCircle, PlayCircle, RefreshCw, ShieldAlert, Wallet } from 'lucide-react';
import {
  TruvaBadge, TruvaButton, TruvaInput, TruvaProgressBar, TruvaStatCard, TruvaStatusPill,
} from '@/components/ui/truva';
import { WalletConnectButton } from '@/components/shared/WalletConnectButton';
import { TRUSTGATE_PROGRAM_ID, getPassportPDA } from '@/lib/solana';
import {
  VAULT_ACCOUNT_SIZE, VAULT_OWNER_OFFSET, deriveVaultTokenAccount, formatUnits, parsePassportAccount,
  parseUnits, parseVaultAccount, setVaultPausedIx, spentToday, updateVaultLimitsIx,
  type PassportData, type VaultData,
} from '@/lib/solana/vault';

const MAX_VAULTS = 12;
const RECENT_TX = 5;

interface VaultView {
  address: PublicKey;
  data: VaultData;
  passport: PassportData | null;
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

      const passports = await connection.getMultipleAccountsInfo(
        parsed.map((v) => getPassportPDA(v.data.agent)[0])
      );

      const views = await Promise.all(parsed.map(async (v, i): Promise<VaultView> => {
        const [balance, recent] = await Promise.all([
          connection.getTokenAccountBalance(deriveVaultTokenAccount(v.data.mint, v.address)),
          connection.getSignaturesForAddress(v.address, { limit: RECENT_TX }),
        ]);
        const passport = passports[i];
        return {
          ...v,
          passport: passport ? parsePassportAccount(passport.data) : null,
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
          <TruvaButton variant="outlined" className="text-[12px]" onClick={load} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> REFRESH
          </TruvaButton>
          <WalletConnectButton />
        </div>
      </div>

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
  const { data, passport, balance, decimals, recent } = vault;
  const fmt = (amount: bigint) => formatUnits(amount, decimals);

  const [editing, setEditing] = useState(false);
  const [perTx, setPerTx] = useState(fmt(data.perTxLimit));
  const [daily, setDaily] = useState(fmt(data.dailyLimit));
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
        <Row label="OWNER">
          <ExplorerLink kind="address" id={data.owner.toBase58()}>{short(data.owner)}</ExplorerLink>
        </Row>
        <Row label="TOKEN_MINT">
          <ExplorerLink kind="address" id={data.mint.toBase58()}>{short(data.mint)}</ExplorerLink>
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

      {isOwner ? (
        <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
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
