'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export function WalletConnectButton() {
  return (
    <WalletMultiButton
      style={{
        backgroundColor: '#00C896',
        color: '#0D1B2A',
        borderRadius: '0.75rem',
        fontWeight: 600,
        fontSize: '14px',
        height: '40px',
      }}
    />
  );
}
