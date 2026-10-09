'use client';

import { useCallback, useEffect, useState } from 'react';
import { PublicKey, type ConfirmedSignatureInfo } from '@solana/web3.js';
import { TruvaButton, TruvaStatCard, TruvaStatusPill } from '@/components/ui/truva';
import { Bot, RefreshCw, ShieldAlert, ShieldCheck, Vault } from 'lucide-react';
import { getConnection } from '@/lib/solana/connection';
import { TRUSTGATE_PROGRAM_ID } from '@/lib/solana';
import {
  PASSPORT_ACCOUNT_SIZE, VAULT_ACCOUNT_SIZE, deriveCommitteePDA, parseCommitteeAccount, parsePassportAccount,
  parseVaultAccount, type CommitteeData,
} from '@/lib/solana/vault';

const UPGRADEABLE_LOADER = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const RECENT_TX = 12;

interface ProtocolStatus {
  admin: string | null;
  scorer: string | null;
  /** The scorer committee, when one has been set */
  committee: (CommitteeData & { address: string; active: boolean }) | null;
  upgradeAuthority: string | null;
  deployedSlot: number | null;
  passports: number;
  tiers: { Bronze: number; Silver: number; Gold: number };
  frozen: number;
  vaults: number;
  pausedVaults: number;
  recent: ConfirmedSignatureInfo[];
}

const explorer = (kind: 'address' | 'tx', id: string) =>
  `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;

const short = (s: string) => `${s.slice(0, 6)}...${s.slice(-6)}`;

async function loadStatus(): Promise<ProtocolStatus> {
  const connection = getConnection();
  const [configPda] = PublicKey.findProgramAddressSync([new TextEncoder().encode('config')], TRUSTGATE_PROGRAM_ID);
  const [programData] = PublicKey.findProgramAddressSync([TRUSTGATE_PROGRAM_ID.toBuffer()], UPGRADEABLE_LOADER);

  const committeePda = deriveCommitteePDA();
  const [[config, data, committee], passports, vaults, recent] = await Promise.all([
    connection.getMultipleAccountsInfo([configPda, programData, committeePda]),
    connection.getProgramAccounts(TRUSTGATE_PROGRAM_ID, { filters: [{ dataSize: PASSPORT_ACCOUNT_SIZE }] }),
    connection.getProgramAccounts(TRUSTGATE_PROGRAM_ID, { filters: [{ dataSize: VAULT_ACCOUNT_SIZE }] }),
    connection.getSignaturesForAddress(TRUSTGATE_PROGRAM_ID, { limit: RECENT_TX }),
  ]);

  const tiers = { Bronze: 0, Silver: 0, Gold: 0 };
  let frozen = 0;
  for (const p of passports) {
    const passport = parsePassportAccount(p.account.data);
    tiers[passport.tier] += 1;
    if (passport.frozen) frozen += 1;
  }

  // ProgramData layout: u32 tag, u64 deploy slot, Option<Pubkey> upgrade authority
  const view = data ? new DataView(data.data.buffer, data.data.byteOffset, data.data.byteLength) : null;

  const scorer = config ? new PublicKey(config.data.subarray(40, 72)).toBase58() : null;

  return {
    admin: config ? new PublicKey(config.data.subarray(8, 40)).toBase58() : null,
    scorer,
    committee: committee
      ? { ...parseCommitteeAccount(committee.data), address: committeePda.toBase58(), active: scorer === committeePda.toBase58() }
      : null,
    deployedSlot: view ? Number(view.getBigUint64(4, true)) : null,
    upgradeAuthority: data && data.data[12] === 1 ? new PublicKey(data.data.subarray(13, 45)).toBase58() : null,
    passports: passports.length,
    tiers,
    frozen,
    vaults: vaults.length,
    pausedVaults: vaults.filter((v) => parseVaultAccount(v.account.data).paused).length,
    recent,
  };
}

function AddressRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px] py-2 border-b border-[var(--border-subtle)] last:border-0">
      <span className="text-[var(--text-muted)] uppercase tracking-[1px] shrink-0">{label}</span>
      {value ? (
        <a href={explorer('address', value)} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--text-primary)] hover:text-[var(--accent-green)] transition-colors truncate">
          {value}
        </a>
      ) : (
        <span className="text-[var(--text-secondary)]">NOT SET</span>
      )}
    </div>
  );
}

export default function ProtocolStatusPage() {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await loadStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read the program');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = (n: number | undefined) => (status ? String(n) : loading ? 'LOADING' : '—');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold">PROTOCOL_STATUS</h1>
            <TruvaStatusPill variant="live" label="DEVNET" />
          </div>
          <p className="text-[13px] uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">
            READ DIRECTLY FROM THE TRUSTGATE PROGRAM
          </p>
        </div>
        <TruvaButton variant="outlined" className="text-[12px]" onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> REFRESH
        </TruvaButton>
      </div>

      {error && (
        <div className="bg-[var(--bg-card)] border border-[var(--red)] rounded-[2px] p-4 mb-4 text-[13px] text-[var(--red)] font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TruvaStatCard label="AGENT_PASSPORTS" value={value(status?.passports)} sub="ON-CHAIN" icon={<Bot size={16} className="text-[var(--accent-green)]" />} />
        <TruvaStatCard
          label="TIERS"
          value={status ? `${status.tiers.Gold} / ${status.tiers.Silver} / ${status.tiers.Bronze}` : value(undefined)}
          sub="GOLD / SILVER / BRONZE"
          icon={<ShieldCheck size={16} className="text-[var(--accent-green)]" />}
        />
        <TruvaStatCard label="FROZEN_PASSPORTS" value={value(status?.frozen)} sub="BLOCKED FROM PAYING" icon={<ShieldAlert size={16} className="text-[var(--red)]" />} />
        <TruvaStatCard label="AGENT_VAULTS" value={value(status?.vaults)} sub={status ? `${status.pausedVaults} PAUSED` : ''} icon={<Vault size={16} className="text-[var(--accent-green)]" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">PROGRAM</h3>
          <AddressRow label="PROGRAM_ID" value={TRUSTGATE_PROGRAM_ID.toBase58()} />
          <AddressRow label="UPGRADE_AUTHORITY" value={status?.upgradeAuthority ?? null} />
          <AddressRow label="CONFIG_ADMIN" value={status?.admin ?? null} />
          <AddressRow label="SCORER" value={status?.scorer ?? null} />
          <div className="flex items-center justify-between gap-4 text-[13px] py-2">
            <span className="text-[var(--text-muted)] uppercase tracking-[1px]">LAST_DEPLOYED_SLOT</span>
            <span className="font-mono">{status?.deployedSlot?.toLocaleString('en-US') ?? '—'}</span>
          </div>
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mt-3">
            {status?.committee?.active
              ? `Scores are written by a committee: ${status.committee.threshold} of ${status.committee.members.length} scorers must agree on the same inputs, and the program takes the median.`
              : 'The scorer is the only key whose trust scores the program accepts. The admin can rotate it, or hand scoring to a committee.'}
          </p>
          {status?.committee && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[13px] uppercase tracking-[2px] font-bold">SCORER_COMMITTEE</h3>
                <TruvaStatusPill
                  variant={status.committee.active ? 'active' : 'standby'}
                  label={status.committee.active ? `ACTIVE · ${status.committee.threshold} OF ${status.committee.members.length}` : 'NOT ACTIVE'}
                />
              </div>
              {status.committee.members.map((member, i) => (
                <AddressRow key={member.toBase58()} label={`MEMBER_${i + 1}`} value={member.toBase58()} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2px] p-5">
          <h3 className="text-[13px] uppercase tracking-[2px] font-bold mb-3">RECENT_PROGRAM_TRANSACTIONS</h3>
          {!status || status.recent.length === 0 ? (
            <div className="text-[12px] text-[var(--text-secondary)]">{loading ? 'LOADING...' : 'NONE'}</div>
          ) : (
            <div className="space-y-1.5">
              {status.recent.map((tx) => (
                <div key={tx.signature} className="flex items-center justify-between gap-3 text-[12px]">
                  <a href={explorer('tx', tx.signature)} target="_blank" rel="noopener noreferrer" className="font-mono text-[var(--text-primary)] hover:text-[var(--accent-green)] transition-colors">
                    {short(tx.signature)}
                  </a>
                  <span className="text-[var(--text-muted)]">
                    {tx.blockTime ? new Date(tx.blockTime * 1000).toISOString().replace('T', ' ').substring(0, 19) : ''}
                  </span>
                  <TruvaStatusPill variant={tx.err ? 'rejected' : 'passed'} label={tx.err ? 'FAILED' : 'CONFIRMED'} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
