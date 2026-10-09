/**
 * Canonical "register agent" message.
 *
 * This module is imported by BOTH the browser (to build the message the wallet
 * signs) and the server (to rebuild the message it verifies), so the two can
 * never drift. Keep it free of Node-only and browser-only APIs.
 *
 * Wire format sent to POST /api/agents alongside the agent fields:
 *   wallet    — base58 Solana address of the signing wallet
 *   signature — base64 (standard alphabet, padded) of the 64-byte ed25519
 *               signature over the UTF-8 bytes of the canonical message
 *   timestamp — ISO-8601 UTC time, exactly as produced by Date#toISOString()
 */

/** A signature older than this is rejected. */
export const REGISTER_MESSAGE_MAX_AGE_MS = 5 * 60_000;
/** A timestamp further in the future than this is rejected (clock skew allowance). */
export const REGISTER_MESSAGE_MAX_FUTURE_MS = 60_000;

export interface RegisterMessageParams {
  /** The agent's public key (base58) being registered. */
  publicKey: string;
  /** The signing wallet (base58). */
  wallet: string;
  /** ISO-8601 UTC timestamp, e.g. 2026-01-01T00:00:00.000Z */
  timestamp: string;
}

export function buildRegisterAgentMessage({ publicKey, wallet, timestamp }: RegisterMessageParams): string {
  return `Truva: register agent\npublic_key: ${publicKey}\nwallet: ${wallet}\ntimestamp: ${timestamp}`;
}

/** UTF-8 bytes of the canonical message — this is exactly what gets signed. */
export function encodeRegisterAgentMessage(params: RegisterMessageParams): Uint8Array {
  return new TextEncoder().encode(buildRegisterAgentMessage(params));
}
