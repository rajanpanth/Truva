/**
 * Canonical "record delegation" message.
 *
 * Imported by BOTH the browser (to build the message the wallet signs) and the
 * server (to rebuild the message it verifies), so the two can never drift.
 * Keep it free of Node-only and browser-only APIs.
 *
 * Wire format sent to POST /api/delegations alongside the delegation fields:
 *   wallet    — base58 Solana address of the signing wallet
 *   signature — base64 (standard alphabet, padded) of the 64-byte ed25519
 *               signature over the UTF-8 bytes of the canonical message
 *   timestamp — ISO-8601 UTC time, exactly as produced by Date#toISOString()
 *
 * Same scheme and freshness window as lib/auth/registerMessage.ts.
 */

/** A signature older than this is rejected. */
export const DELEGATION_MESSAGE_MAX_AGE_MS = 5 * 60_000;
/** A timestamp further in the future than this is rejected (clock skew allowance). */
export const DELEGATION_MESSAGE_MAX_FUTURE_MS = 60_000;

/** Placeholder signed in the tx_sig line when the delegation has no transaction. */
export const DELEGATION_NO_TX_SIG = 'none';

export interface DelegationMessageParams {
  /** The agent the delegation is for (the id used in /delegate/[id]). */
  agentId: string;
  /** The signing wallet (base58). */
  wallet: string;
  /** Transaction signature (base58) of the vault creation, if there is one. */
  txSig?: string | null;
  /** ISO-8601 UTC timestamp, e.g. 2026-01-01T00:00:00.000Z */
  timestamp: string;
}

export function buildRecordDelegationMessage({ agentId, wallet, txSig, timestamp }: DelegationMessageParams): string {
  return `Truva: record delegation\nagent_id: ${agentId}\nwallet: ${wallet}\ntx_sig: ${txSig || DELEGATION_NO_TX_SIG}\ntimestamp: ${timestamp}`;
}

/** UTF-8 bytes of the canonical message — this is exactly what gets signed. */
export function encodeRecordDelegationMessage(params: DelegationMessageParams): Uint8Array {
  return new TextEncoder().encode(buildRecordDelegationMessage(params));
}
