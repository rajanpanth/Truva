import { createPublicKey, verify } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import {
  DELEGATION_MESSAGE_MAX_AGE_MS,
  DELEGATION_MESSAGE_MAX_FUTURE_MS,
  encodeRecordDelegationMessage,
} from '@/lib/auth/delegationMessage';

/** DER prefix of an ed25519 SubjectPublicKeyInfo; the raw 32-byte key follows. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

export interface DelegationSignatureInput {
  /** Agent the delegation is for (the id used in /delegate/[id]). */
  agentId: string;
  /** Signing wallet (base58). */
  wallet: string;
  /** Transaction signature that was signed into the message, if any. */
  txSig?: string | null;
  /** base64 ed25519 signature over the canonical message. */
  signature: string;
  /** ISO-8601 UTC timestamp that was signed. */
  timestamp: string;
}

export type DelegationSignatureResult = { ok: true } | { ok: false; error: string };

/**
 * Verify that `wallet` signed the canonical record-delegation message for
 * `agentId` / `txSig` at `timestamp`, and that the timestamp is fresh.
 * Node runtime only. Mirrors verifyRegisterSignature.
 */
export function verifyDelegationSignature(
  input: DelegationSignatureInput,
  now: number = Date.now()
): DelegationSignatureResult {
  const { agentId, wallet, txSig, signature, timestamp } = input;

  if (typeof timestamp !== 'string' || !ISO_UTC_REGEX.test(timestamp)) {
    return { ok: false, error: 'Invalid timestamp: expected ISO-8601 UTC (e.g. 2026-01-01T00:00:00.000Z)' };
  }
  const signedAt = Date.parse(timestamp);
  if (!Number.isFinite(signedAt)) {
    return { ok: false, error: 'Invalid timestamp' };
  }
  if (now - signedAt > DELEGATION_MESSAGE_MAX_AGE_MS) {
    return { ok: false, error: 'Signature expired: sign a fresh delegation message and retry' };
  }
  if (signedAt - now > DELEGATION_MESSAGE_MAX_FUTURE_MS) {
    return { ok: false, error: 'Signature timestamp is in the future: check your device clock' };
  }

  let walletBytes: Uint8Array;
  try {
    walletBytes = new PublicKey(wallet).toBytes();
  } catch {
    return { ok: false, error: 'Invalid wallet: expected a base58 Solana address' };
  }

  if (typeof signature !== 'string' || !BASE64_REGEX.test(signature)) {
    return { ok: false, error: 'Invalid signature: expected base64' };
  }
  const signatureBytes = Buffer.from(signature, 'base64');
  if (signatureBytes.length !== 64) {
    return { ok: false, error: 'Invalid signature: expected a 64-byte ed25519 signature (base64)' };
  }

  let valid = false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(walletBytes)]),
      format: 'der',
      type: 'spki',
    });
    valid = verify(null, encodeRecordDelegationMessage({ agentId, wallet, txSig, timestamp }), key, signatureBytes);
  } catch {
    valid = false;
  }

  if (!valid) {
    return { ok: false, error: 'Signature does not match wallet for this delegation message' };
  }
  return { ok: true };
}
