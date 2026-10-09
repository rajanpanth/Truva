import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { TRUSTGATE_PROGRAM_ID } from '@/lib/solana';

/**
 * Agent vault helpers for the web app.
 * Mirrors `sdk/src/instructions.ts` and `sdk/src/pda.ts` — keep the layouts in sync.
 */

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export const MAX_ALLOWLIST = 8;
export const SPEND_WINDOW_SECS = 86_400;

/** 8 (discriminator) + 3 keys + 3 u64 + i64 + u64 + 2 flags + 8 keys + bump */
export const VAULT_ACCOUNT_SIZE = 403;
/** Byte offset of `owner` inside an `AgentVault` account */
export const VAULT_OWNER_OFFSET = 8;

const DISCRIMINATORS = {
  update_vault_policy: [1, 197, 247, 6, 171, 175, 234, 107],
  set_vault_paused: [239, 131, 203, 69, 243, 11, 234, 153],
};

export type TierName = 'Bronze' | 'Silver' | 'Gold';
const TIER_BY_RANK: TierName[] = ['Bronze', 'Silver', 'Gold'];

export interface VaultData {
  owner: PublicKey;
  agent: PublicKey;
  mint: PublicKey;
  perTxLimit: bigint;
  dailyLimit: bigint;
  spentInWindow: bigint;
  windowStart: number;
  totalSpent: bigint;
  paused: boolean;
  /** Empty = any recipient */
  allowlist: PublicKey[];
}

export interface PassportData {
  trustScore: number;
  tier: TierName;
  frozen: boolean;
}

export function deriveVaultPDA(owner: PublicKey, agent: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), owner.toBuffer(), agent.toBuffer(), mint.toBuffer()],
    TRUSTGATE_PROGRAM_ID
  )[0];
}

export function deriveVaultTokenAccount(mint: PublicKey, vault: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [vault.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

function readU64(data: Uint8Array, offset: number): bigint {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true);
}

function u64(value: bigint): Buffer {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return Buffer.from(bytes);
}

export function parseVaultAccount(data: Uint8Array): VaultData {
  let offset = 8;
  const key = () => {
    const k = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    return k;
  };
  const big = () => {
    const v = readU64(data, offset);
    offset += 8;
    return v;
  };

  const owner = key();
  const agent = key();
  const mint = key();
  const perTxLimit = big();
  const dailyLimit = big();
  const spentInWindow = big();
  const windowStart = Number(big());
  const totalSpent = big();
  const paused = data[offset] === 1; offset += 1;
  const allowlistLen = data[offset]; offset += 1;
  const allowlist: PublicKey[] = [];
  for (let i = 0; i < MAX_ALLOWLIST; i++) {
    const k = key();
    if (i < allowlistLen) allowlist.push(k);
  }

  return { owner, agent, mint, perTxLimit, dailyLimit, spentInWindow, windowStart, totalSpent, paused, allowlist };
}

/** Parse an `AgentPassport` account (agent, authority, trust_score, trust_tier, tx_count, success_count, frozen). */
export function parsePassportAccount(data: Uint8Array): PassportData {
  return {
    trustScore: data[72],
    tier: TIER_BY_RANK[data[73]] ?? 'Bronze',
    frozen: data[90] === 1,
  };
}

/** Amount already spent in the current 24h window (0 once the window has rolled over). */
export function spentToday(vault: VaultData, nowSecs: number): bigint {
  return nowSecs - vault.windowStart >= SPEND_WINDOW_SECS ? BigInt(0) : vault.spentInWindow;
}

/** Pause or resume agent payments from a vault. Signed by the owner. */
export function setVaultPausedIx(vault: VaultData, paused: boolean): TransactionInstruction {
  return new TransactionInstruction({
    programId: TRUSTGATE_PROGRAM_ID,
    keys: [
      { pubkey: deriveVaultPDA(vault.owner, vault.agent, vault.mint), isSigner: false, isWritable: true },
      { pubkey: vault.owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from(DISCRIMINATORS.set_vault_paused), Buffer.from([paused ? 1 : 0])]),
  });
}

/** Change a vault's limits, keeping its allowlist. Signed by the owner. */
export function updateVaultLimitsIx(vault: VaultData, perTxLimit: bigint, dailyLimit: bigint): TransactionInstruction {
  const len = Buffer.alloc(4);
  len.writeUInt32LE(vault.allowlist.length);
  return new TransactionInstruction({
    programId: TRUSTGATE_PROGRAM_ID,
    keys: [
      { pubkey: deriveVaultPDA(vault.owner, vault.agent, vault.mint), isSigner: false, isWritable: true },
      { pubkey: vault.owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([
      Buffer.from(DISCRIMINATORS.update_vault_policy),
      u64(perTxLimit),
      u64(dailyLimit),
      len,
      ...vault.allowlist.map((k) => k.toBuffer()),
    ]),
  });
}

/** Format token base units as a decimal string, e.g. 1500000 with 6 decimals -> "1.50". */
export function formatUnits(amount: bigint, decimals: number): string {
  const base = BigInt(10) ** BigInt(decimals);
  const whole = amount / base;
  const frac = (amount % base).toString().padStart(decimals, '0').replace(/0+$/, '').padEnd(2, '0');
  return decimals === 0 ? whole.toString() : `${whole}.${frac}`;
}

/** Parse a decimal string into token base units. Returns null when it is not a valid amount. */
export function parseUnits(value: string, decimals: number): bigint | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const frac = match[2] ?? '';
  if (frac.length > decimals) return null;
  return BigInt(match[1]) * BigInt(10) ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0') || '0');
}
