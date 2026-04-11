import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRUVA — Trust Gate for AI Agent Payments on Solana",
  description:
    "Verify WHO an AI agent is, WHAT it has done, and WHETHER it can execute a payment. Solana-native programmable trust gate.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-mono bg-[#000]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
