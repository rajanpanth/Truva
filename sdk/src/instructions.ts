/**
 * Instruction builders and account parsers for the TrustGate program.
 *
 * Browser-safe: pure `@solana/web3.js`, no Anchor Program or IDL file needed.
 * Discriminators are checked against the IDL naming rule in `instructions.test.ts`.
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import type { TrustTier } from "./types";
import { TIER_RANK } from "./types";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TRUSTGATE_PROGRAM_ID,
  deriveAssociatedTokenAddress,
  deriveConfigPDA,
  deriveMerchantPolicyPDA,
  derivePassportPDA,
  deriveVaultPDA,
} from "./pda";

/** Maximum number of recipients on a vault allowlist. */
export const MAX_ALLOWLIST = 8;

/** Anchor instruction discriminators: `sha256("global:<name>")[0..8]`. */
export const DISCRIMINATORS = {
  initialize_passport: [61, 77, 198, 139, 101, 90, 68, 137],
  verify_trust: [27, 193, 157, 105, 249, 36, 202, 54],
  set_merchant_policy: [61, 182, 222, 37, 184, 165, 142, 197],
  close_merchant_policy: [200, 56, 65, 194, 108, 9, 153, 10],
  create_vault: [29, 237, 247, 208, 193, 82, 54, 135],
  update_vault_policy: [1, 197, 247, 6, 171, 175, 234, 107],
  set_vault_paused: [239, 131, 203, 69, 243, 11, 234, 153],
  vault_pay: [81, 165, 99, 6, 171, 27, 225, 236],
  vault_withdraw: [98, 28, 187, 98, 87, 69, 46, 64],
  close_vault: [141, 103, 17, 126, 72, 75, 29, 29],
} as const;

/** Custom program error codes (Anchor offset 6000). */
export const PROGRAM_ERRORS: Record<number, string> = {
  6000: "PassportFrozen",
  6001: "InsufficientTrustTier",
  6002: "ExceedsTierLimit",
  6003: "Unauthorized",
  6004: "InvalidTrustScore",
  6005: "ArithmeticOverflow",
  6006: "UntrustedAuthority",
  6007: "InvalidProgramData",
  6008: "VaultPaused",
  6009: "ExceedsPerTxLimit",
  6010: "ExceedsDailyLimit",
  6011: "RecipientNotAllowed",
  6012: "AllowlistTooLong",
  6013: "InvalidLimits",
  6014: "InvalidAmount",
  6015: "MintMismatch",
};

// ── Encoding helpers ─────────────────────────────────────────────────────────

function u64(value: bigint | number): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function pubkeyVec(keys: PublicKey[]): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32LE(keys.length);
  return Buffer.concat([len, ...keys.map((k) => k.toBuffer())]);
}

function ixData(name: keyof typeof DISCRIMINATORS, ...parts: Buffer[]): Buffer {
  return Buffer.concat([Buffer.from(DISCRIMINATORS[name]), ...parts]);
}

const ro = (pubkey: PublicKey) => ({ pubkey, isSigner: false, isWritable: false });
const rw = (pubkey: PublicKey) => ({ pubkey, isSigner: false, isWritable: true });
const signer = (pubkey: PublicKey, isWritable = false) => ({ pubkey, isSigner: true, isWritable });

// ── Passport / trust ─────────────────────────────────────────────────────────

/** Create an agent's passport. Anyone can pay; the authority is the protocol scorer. */
export function initializePassportIx(
  agent: PublicKey,
  payer: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      ro(deriveConfigPDA(programId)[0]),
      rw(derivePassportPDA(agent, programId)[0]),
      ro(agent),
      signer(payer, true),
      ro(SystemProgram.programId),
    ],
    data: ixData("initialize_passport"),
  });
}

/** Read-only on-chain trust check. Fails the transaction if the agent is below `minTier`. */
export function verifyTrustIx(
  agent: PublicKey,
  minTier: TrustTier,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      ro(deriveConfigPDA(programId)[0]),
      ro(derivePassportPDA(agent, programId)[0]),
    ],
    data: ixData("verify_trust", Buffer.from([TIER_RANK[minTier]])),
  });
}

// ── Merchant policy ──────────────────────────────────────────────────────────

/** Set the minimum tier agents need to pay `merchant`. Signed by the merchant. */
export function setMerchantPolicyIx(
  merchant: PublicKey,
  minTier: TrustTier,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      rw(deriveMerchantPolicyPDA(merchant, programId)[0]),
      signer(merchant, true),
      ro(SystemProgram.programId),
    ],
    data: ixData("set_merchant_policy", Buffer.from([TIER_RANK[minTier]])),
  });
}

/** Remove the merchant's policy and reclaim rent. */
export function closeMerchantPolicyIx(
  merchant: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      rw(deriveMerchantPolicyPDA(merchant, programId)[0]),
      signer(merchant, true),
    ],
    data: ixData("close_merchant_policy"),
  });
}

// ── Agent vault ──────────────────────────────────────────────────────────────

export interface VaultPolicyInput {
  /** Maximum amount per payment, in token base units */
  perTxLimit: bigint | number;
  /** Maximum amount per 24h window, in token base units */
  dailyLimit: bigint | number;
  /** Recipient wallets the agent may pay. Empty = any recipient. Max 8. */
  allowlist?: PublicKey[];
}

function policyData(policy: VaultPolicyInput): Buffer[] {
  const allowlist = policy.allowlist ?? [];
  if (allowlist.length > MAX_ALLOWLIST) {
    throw new Error(`Allowlist holds at most ${MAX_ALLOWLIST} recipients`);
  }
  if (BigInt(policy.perTxLimit) > BigInt(policy.dailyLimit)) {
    throw new Error("Per-payment limit cannot exceed the daily limit");
  }
  return [u64(policy.perTxLimit), u64(policy.dailyLimit), pubkeyVec(allowlist)];
}

/**
 * Create a spending vault for one agent and one mint. Signed by the owner.
 * Fund it afterwards with a normal token transfer to the vault's token account
 * (`deriveAssociatedTokenAddress(mint, vault)`).
 */
export function createVaultIx(
  owner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  policy: VaultPolicyInput,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  const [vault] = deriveVaultPDA(owner, agent, mint, programId);
  return new TransactionInstruction({
    programId,
    keys: [
      rw(vault),
      rw(deriveAssociatedTokenAddress(mint, vault)),
      ro(agent),
      ro(mint),
      signer(owner, true),
      ro(TOKEN_PROGRAM_ID),
      ro(ASSOCIATED_TOKEN_PROGRAM_ID),
      ro(SystemProgram.programId),
    ],
    data: ixData("create_vault", ...policyData(policy)),
  });
}

/** Change a vault's limits and allowlist. Signed by the owner. */
export function updateVaultPolicyIx(
  owner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  policy: VaultPolicyInput,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [rw(deriveVaultPDA(owner, agent, mint, programId)[0]), signer(owner)],
    data: ixData("update_vault_policy", ...policyData(policy)),
  });
}

/** Pause or resume agent payments from a vault. Signed by the owner. */
export function setVaultPausedIx(
  owner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  paused: boolean,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [rw(deriveVaultPDA(owner, agent, mint, programId)[0]), signer(owner)],
    data: ixData("set_vault_paused", Buffer.from([paused ? 1 : 0])),
  });
}

/**
 * Pay `recipient` from a vault. Signed by the agent; the program enforces the
 * owner's limits, the agent's passport and the recipient's merchant policy.
 * The recipient's associated token account must already exist.
 */
export function vaultPayIx(
  vaultOwner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  recipient: PublicKey,
  amount: bigint | number,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  const [vault] = deriveVaultPDA(vaultOwner, agent, mint, programId);
  return new TransactionInstruction({
    programId,
    keys: [
      ro(deriveConfigPDA(programId)[0]),
      rw(derivePassportPDA(agent, programId)[0]),
      rw(vault),
      rw(deriveAssociatedTokenAddress(mint, vault)),
      rw(deriveAssociatedTokenAddress(mint, recipient)),
      ro(deriveMerchantPolicyPDA(recipient, programId)[0]),
      ro(mint),
      signer(agent),
      ro(TOKEN_PROGRAM_ID),
    ],
    data: ixData("vault_pay", u64(amount)),
  });
}

/** Withdraw tokens from a vault to the owner's associated token account. */
export function vaultWithdrawIx(
  owner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  amount: bigint | number,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  const [vault] = deriveVaultPDA(owner, agent, mint, programId);
  return new TransactionInstruction({
    programId,
    keys: [
      ro(vault),
      rw(deriveAssociatedTokenAddress(mint, vault)),
      rw(deriveAssociatedTokenAddress(mint, owner)),
      ro(mint),
      signer(owner),
      ro(TOKEN_PROGRAM_ID),
    ],
    data: ixData("vault_withdraw", u64(amount)),
  });
}

/** Return the remaining balance to the owner and close the vault. */
export function closeVaultIx(
  owner: PublicKey,
  agent: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TRUSTGATE_PROGRAM_ID
): TransactionInstruction {
  const [vault] = deriveVaultPDA(owner, agent, mint, programId);
  return new TransactionInstruction({
    programId,
    keys: [
      rw(vault),
      rw(deriveAssociatedTokenAddress(mint, vault)),
      rw(deriveAssociatedTokenAddress(mint, owner)),
      ro(mint),
      signer(owner, true),
      ro(TOKEN_PROGRAM_ID),
    ],
    data: ixData("close_vault"),
  });
}

// ── Account parsers ──────────────────────────────────────────────────────────

const TIER_BY_RANK: TrustTier[] = ["Bronze", "Silver", "Gold"];

export interface ProtocolConfigData {
  admin: PublicKey;
  /** The only key whose scores and tiers the gate accepts */
  scorer: PublicKey;
}

export interface MerchantPolicyData {
  merchant: PublicKey;
  minTier: TrustTier;
}

export interface AgentVaultData {
  owner: PublicKey;
  agent: PublicKey;
  mint: PublicKey;
  perTxLimit: bigint;
  dailyLimit: bigint;
  /** Amount spent in the current 24h window */
  spentInWindow: bigint;
  /** Unix timestamp the current window started */
  windowStart: number;
  totalSpent: bigint;
  paused: boolean;
  /** Empty = any recipient */
  allowlist: PublicKey[];
}

/** Parse a `ProtocolConfig` account (after the 8-byte discriminator: admin, scorer, bump). */
export function parseConfigAccount(data: Buffer): ProtocolConfigData {
  return {
    admin: new PublicKey(data.subarray(8, 40)),
    scorer: new PublicKey(data.subarray(40, 72)),
  };
}

/** Parse a `MerchantPolicy` account (merchant, min_tier, bump). */
export function parseMerchantPolicyAccount(data: Buffer): MerchantPolicyData {
  return {
    merchant: new PublicKey(data.subarray(8, 40)),
    minTier: TIER_BY_RANK[data[40]] ?? "Bronze",
  };
}

/** Parse an `AgentVault` account. */
export function parseVaultAccount(data: Buffer): AgentVaultData {
  let offset = 8;
  const key = () => {
    const k = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    return k;
  };
  const big = () => {
    const v = data.readBigUInt64LE(offset);
    offset += 8;
    return v;
  };

  const owner = key();
  const agent = key();
  const mint = key();
  const perTxLimit = big();
  const dailyLimit = big();
  const spentInWindow = big();
  const windowStart = Number(data.readBigInt64LE(offset)); offset += 8;
  const totalSpent = big();
  const paused = data[offset] === 1; offset += 1;
  const allowlistLen = data[offset]; offset += 1;
  const allowlist: PublicKey[] = [];
  for (let i = 0; i < MAX_ALLOWLIST; i++) {
    const k = key();
    if (i < allowlistLen) allowlist.push(k);
  }

  return {
    owner, agent, mint, perTxLimit, dailyLimit, spentInWindow,
    windowStart, totalSpent, paused, allowlist,
  };
}
