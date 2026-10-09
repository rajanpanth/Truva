import { createPublicKey, verify } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import {
  REGISTER_MESSAGE_MAX_AGE_MS,
  REGISTER_MESSAGE_MAX_FUTURE_MS,
  encodeRegisterAgentMessage,
} from '@/lib/auth/registerMessage';

/** DER prefix of an ed25519 SubjectPublicKeyInfo; the raw 32-byte key follows. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

export interface RegisterSignatureInput {
  /** Agent public key being registered (base58). */
  publicKey: string;
  /** Signing wallet (base58). */
  wallet: string;
  /** base64 ed25519 signature over the canonical message. */
  signature: string;
  /** ISO-8601 UTC timestamp that was signed. */
  timestamp: string;
}

export type RegisterSignatureResult = { ok: true } | { ok: false; error: string };

/**
 * Verify that `wallet` signed the canonical register message for `publicKey`
 * at `timestamp`, and that the timestamp is fresh. Node runtime only.
 */
export function verifyRegisterSignature(
  input: RegisterSignatureInput,
  now: number = Date.now()
): RegisterSignatureResult {
  const { publicKey, wallet, signature, timestamp } = input;

  if (typeof timestamp !== 'string' || !ISO_UTC_REGEX.test(timestamp)) {
    return { ok: false, error: 'Invalid timestamp: expected ISO-8601 UTC (e.g. 2026-01-01T00:00:00.000Z)' };
  }
  const signedAt = Date.parse(timestamp);
  if (!Number.isFinite(signedAt)) {
    return { ok: false, error: 'Invalid timestamp' };
  }
  if (now - signedAt > REGISTER_MESSAGE_MAX_AGE_MS) {
    return { ok: false, error: 'Signature expired: sign a fresh registration message and retry' };
  }
  if (signedAt - now > REGISTER_MESSAGE_MAX_FUTURE_MS) {
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
    valid = verify(null, encodeRegisterAgentMessage({ publicKey, wallet, timestamp }), key, signatureBytes);
  } catch {
    valid = false;
  }

  if (!valid) {
    return { ok: false, error: 'Signature does not match wallet for this registration message' };
  }
  return { ok: true };
}
