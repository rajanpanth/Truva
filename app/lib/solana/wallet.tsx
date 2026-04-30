'use client';

import { useMemo, type ComponentType } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import type { ConnectionProviderProps } from '@solana/wallet-adapter-react';
import type { WalletProviderProps } from '@solana/wallet-adapter-react';

import '@solana/wallet-adapter-react-ui/styles.css';

// Type casts needed for React 18.3+ compatibility with @solana/wallet-adapter-react
const CP = ConnectionProvider as ComponentType<ConnectionProviderProps & { children: React.ReactNode }>;
const WP = WalletProvider as ComponentType<WalletProviderProps & { children: React.ReactNode }>;
const WMP = WalletModalProvider as ComponentType<{ children: React.ReactNode }>;

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  const wallets = useMemo(() => [], []);

  return (
    <CP endpoint={endpoint}>
      <WP wallets={wallets} autoConnect>
        <WMP>
          {children}
        </WMP>
      </WP>
    </CP>
  );
}
