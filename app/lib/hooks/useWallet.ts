'use client';

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';

export function useWalletConnection() {
  const { publicKey, connected, connecting, disconnect, wallet } = useSolanaWallet();

  return {
    publicKey: publicKey?.toBase58() ?? null,
    connected,
    connecting,
    disconnect,
    walletName: wallet?.adapter.name ?? null,
  };
}
