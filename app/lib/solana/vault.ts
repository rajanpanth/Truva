import {
  Connection, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction,
} from '@solana/web3.js';
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

/** 8 (discriminator) + agent + authority + score + tier + 2 counters + frozen + 2 timestamps + bump */
export const PASSPORT_ACCOUNT_SIZE = 108;

/** Circle's USDC on Solana devnet */
export const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

/** Display symbol for mints the app knows; other mints are shown without a symbol. */
export function tokenSymbol(mint: PublicKey): string | null {
  return mint.equals(DEVNET_USDC_MINT) ? 'USDC' : null;
}

const DISCRIMINATORS = {
  create_vault: [29, 237, 247, 208, 193, 82, 54, 135],
  update_vault_policy: [1, 197, 247, 6, 171, 175, 234, 107],
  set_vault_paused: [239, 131, 203, 69, 243, 11, 234, 153],
  vault_pay: [81, 165, 99, 6, 171, 27, 225, 236],
  vault_withdraw: [98, 28, 187, 98, 87, 69, 46, 64],
};

/** Custom program errors a payment can hit, in plain words. */
export const PAYMENT_ERRORS: Record<number, { name: string; reason: string }> = {
  6000: { name: 'PassportFrozen', reason: "The agent's passport is frozen by the protocol." },
  6001: { name: 'InsufficientTrustTier', reason: "The agent's trust tier is below what this recipient requires." },
  6002: { name: 'ExceedsTierLimit', reason: "The amount is above the agent's tier limit." },
  6003: { name: 'Unauthorized', reason: 'The signer is not allowed to do this.' },
  6008: { name: 'VaultPaused', reason: 'The owner has paused this vault.' },
  6009: { name: 'ExceedsPerTxLimit', reason: "The amount is above the vault's per-payment limit." },
  6010: { name: 'ExceedsDailyLimit', reason: "The payment would exceed the vault's daily limit." },
  6011: { name: 'RecipientNotAllowed', reason: "The recipient is not on the vault's allowlist." },
  6012: { name: 'AllowlistTooLong', reason: 'A vault can list at most 8 recipients.' },
  6013: { name: 'InvalidLimits', reason: 'The per-payment limit cannot exceed the daily limit.' },
  6014: { name: 'InvalidAmount', reason: 'The amount must be greater than zero.' },
  6015: { name: 'MintMismatch', reason: 'The token does not match the vault.' },
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

function policyData(perTxLimit: bigint, dailyLimit: bigint, allowlist: PublicKey[]): Buffer[] {
  if (allowlist.length > MAX_ALLOWLIST) throw new Error(`A vault can list at most ${MAX_ALLOWLIST} recipients`);
  if (perTxLimit > dailyLimit) throw new Error('Per-payment limit cannot exceed the daily limit');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(allowlist.length);
  return [u64(perTxLimit), u64(dailyLimit), len, ...allowlist.map((k) => k.toBuffer())];
}

const ro = (pubkey: PublicKey) => ({ pubkey, isSigner: false, isWritable: false });
const rw = (pubkey: PublicKey) => ({ pubkey, isSigner: false, isWritable: true });
const signer = (pubkey: PublicKey, isWritable = false) => ({ pubkey, isSigner: true, isWritable });

/** Create a spending vault for one agent and one mint. Signed by the owner. */
export function createVaultIx(
  owner: PublicKey, agent: PublicKey, mint: PublicKey,
  perTxLimit: bigint, dailyLimit: bigint, allowlist: PublicKey[]
): TransactionInstruction {
  const vault = deriveVaultPDA(owner, agent, mint);
  return new TransactionInstruction({
    programId: TRUSTGATE_PROGRAM_ID,
    keys: [
      rw(vault),
      rw(deriveVaultTokenAccount(mint, vault)),
      ro(agent),
      ro(mint),
      signer(owner, true),
      ro(TOKEN_PROGRAM_ID),
      ro(ASSOCIATED_TOKEN_PROGRAM_ID),
      ro(SystemProgram.programId),
    ],
    data: Buffer.concat([Buffer.from(DISCRIMINATORS.create_vault), ...policyData(perTxLimit, dailyLimit, allowlist)]),
  });
}

/** Fund a vault: a plain SPL `TransferChecked` from the sender's associated token account. */
export function depositIx(
  from: PublicKey, vault: PublicKey, mint: PublicKey, amount: bigint, decimals: number
): TransactionInstruction {
  return new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      rw(deriveVaultTokenAccount(mint, from)),
      ro(mint),
      rw(deriveVaultTokenAccount(mint, vault)),
      signer(from),
    ],
    data: Buffer.concat([Buffer.from([12]), u64(amount), Buffer.from([decimals])]),
  });
}

/** Withdraw tokens from a vault to the owner's associated token account. Signed by the owner. */
export function withdrawIx(vault: VaultData, amount: bigint): TransactionInstruction {
  const address = deriveVaultPDA(vault.owner, vault.agent, vault.mint);
  return new TransactionInstruction({
    programId: TRUSTGATE_PROGRAM_ID,
    keys: [
      ro(address),
      rw(deriveVaultTokenAccount(vault.mint, address)),
      rw(deriveVaultTokenAccount(vault.mint, vault.owner)),
      ro(vault.mint),
      signer(vault.owner),
      ro(TOKEN_PROGRAM_ID),
    ],
    data: Buffer.concat([Buffer.from(DISCRIMINATORS.vault_withdraw), u64(amount)]),
  });
}

/** Pay `recipient` from a vault. Signed by the agent. */
export function vaultPayIx(vault: VaultData, recipient: PublicKey, amount: bigint): TransactionInstruction {
  const address = deriveVaultPDA(vault.owner, vault.agent, vault.mint);
  const pda = (...seeds: (Buffer | Uint8Array)[]) =>
    PublicKey.findProgramAddressSync(seeds, TRUSTGATE_PROGRAM_ID)[0];
  return new TransactionInstruction({
    programId: TRUSTGATE_PROGRAM_ID,
    keys: [
      ro(pda(Buffer.from('config'))),
      rw(pda(Buffer.from('passport'), vault.agent.toBuffer())),
      rw(address),
      rw(deriveVaultTokenAccount(vault.mint, address)),
      rw(deriveVaultTokenAccount(vault.mint, recipient)),
      ro(pda(Buffer.from('merchant'), recipient.toBuffer())),
      ro(vault.mint),
      signer(vault.agent),
      ro(TOKEN_PROGRAM_ID),
    ],
    data: Buffer.concat([Buffer.from(DISCRIMINATORS.vault_pay), u64(amount)]),
  });
}

export interface PaymentVerdict {
  allowed: boolean;
  /** Program error name, e.g. `ExceedsDailyLimit` */
  code?: string;
  reason: string;
}

/**
 * Ask the cluster whether the agent could make this payment right now.
 * Nothing is signed or sent: the transaction is only simulated, so the
 * verdict is the program's own.
 */
export async function simulateVaultPayment(
  connection: Connection, vault: VaultData, recipient: PublicKey, amount: bigint
): Promise<PaymentVerdict> {
  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({
    // No fee is charged in a simulation; the owner is used because the account is known to exist.
    payerKey: vault.owner,
    recentBlockhash: blockhash,
    instructions: [vaultPayIx(vault, recipient, amount)],
  }).compileToV0Message();
  const result = await connection.simulateTransaction(new VersionedTransaction(message), {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });

  const err = result.value.err;
  if (!err) return { allowed: true, reason: 'The program would accept this payment.' };

  const detail = (err as { InstructionError?: [number, { Custom?: number } | string] }).InstructionError?.[1];
  const code = typeof detail === 'object' ? detail.Custom : undefined;
  if (code !== undefined && PAYMENT_ERRORS[code]) {
    return { allowed: false, code: PAYMENT_ERRORS[code].name, reason: PAYMENT_ERRORS[code].reason };
  }
  // Anchor account errors name the account that failed its checks
  const logs = (result.value.logs ?? []).join(' ');
  if (/recipient_token/.test(logs)) {
    return { allowed: false, code: 'RecipientHasNoTokenAccount', reason: 'The recipient has no token account for this token yet.' };
  }
  if (/account: passport/.test(logs)) {
    return { allowed: false, code: 'NoPassport', reason: 'The agent has no passport.' };
  }
  if (/insufficient funds/i.test(logs)) {
    return { allowed: false, code: 'InsufficientFunds', reason: 'The vault balance is too low.' };
  }
  return { allowed: false, code: 'Rejected', reason: typeof err === 'string' ? err : JSON.stringify(err) };
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
  return new TransactionInstruction({
    programId: TRUSTGATE_PROGRAM_ID,
    keys: [rw(deriveVaultPDA(vault.owner, vault.agent, vault.mint)), signer(vault.owner)],
    data: Buffer.concat([
      Buffer.from(DISCRIMINATORS.update_vault_policy),
      ...policyData(perTxLimit, dailyLimit, vault.allowlist),
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
