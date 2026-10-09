import { encodeRegisterAgentMessage } from './registerMessage';

/** Thrown when the connected wallet cannot sign arbitrary messages. */
export const SIGN_MESSAGE_UNSUPPORTED =
  'WALLET_DOES_NOT_SUPPORT_MESSAGE_SIGNING — USE_A_WALLET_THAT_CAN_SIGN_MESSAGES (E.G. PHANTOM OR SOLFLARE)';

export type SignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

export interface RegisterAuthFields {
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
 * Ask the wallet to sign the canonical register message (browser only).
 * Returns the fields POST /api/agents requires.
 */
export async function signRegisterAgentMessage(
  signMessage: SignMessageFn | undefined,
  params: { publicKey: string; wallet: string }
): Promise<RegisterAuthFields> {
  if (!signMessage) throw new Error(SIGN_MESSAGE_UNSUPPORTED);

  const timestamp = new Date().toISOString();
  const signature = await signMessage(
    encodeRegisterAgentMessage({ publicKey: params.publicKey, wallet: params.wallet, timestamp })
  );

  return { wallet: params.wallet, signature: toBase64(signature), timestamp };
}
