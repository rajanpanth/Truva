import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TRUVA | Trust Gate for AI Agents',
  description:
    'The trust & enforcement layer for the Solana AI Agent economy. Register agents, enforce policies, and monitor transactions through the TrustGate.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-mono antialiased" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: '2px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
