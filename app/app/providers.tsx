'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect, type ReactNode } from 'react';

function LazyWalletProvider({ children }: { children: ReactNode }) {
  const [WalletProvider, setWalletProvider] = useState<React.ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    import('@/lib/solana/wallet').then((mod) => {
      setWalletProvider(() => mod.SolanaWalletProvider);
    });
  }, []);

  if (!WalletProvider) return null;
  return <WalletProvider>{children}</WalletProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LazyWalletProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </LazyWalletProvider>
    </QueryClientProvider>
  );
}
