import { encodeRecordDelegationMessage } from './delegationMessage';

export type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

export interface DelegationAuthFields {
  wallet: string;
  /** base64 ed25519 signature */
  signature: string;
  /** ISO-8601 UTC */
  timestamp: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Ask the wallet to sign the canonical record-delegation message (browser only).
 * Returns the auth fields POST /api/delegations requires.
 *
 * Throws if the wallet cannot sign messages or the user rejects the prompt;
 * callers that treat recording as best-effort should catch.
 */
export async function signRecordDelegationMessage(
  signMessage: SignMessageFn | undefined,
  params: { agentId: string; wallet: string; txSig?: string | null }
): Promise<DelegationAuthFields> {
  if (!signMessage) throw new Error('Wallet does not support message signing');

  const timestamp = new Date().toISOString();
  const signature = await signMessage(
    encodeRecordDelegationMessage({
      agentId: params.agentId,
      wallet: params.wallet,
      txSig: params.txSig,
      timestamp,
    })
  );

  return { wallet: params.wallet, signature: toBase64(signature), timestamp };
}
