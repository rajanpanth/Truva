'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const barData = [35, 55, 40, 70, 50, 80, 45, 65, 75, 60, 85, 50, 70, 90, 55];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] px-6 pb-20 pt-8">
      {/* System status banner */}
      <div className="mx-auto mb-12 max-w-7xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00ff88]" />
          <span className="font-mono text-[13px] tracking-widest text-[#00ff88]">
            SYSTEM_STATUS: OPERATIONAL
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-16 lg:flex-row lg:items-center lg:justify-between">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <h1 className="mb-6 font-mono text-5xl font-extrabold uppercase leading-[1.1] tracking-tight text-white md:text-7xl">
            THE TRUST GATE{'\n'}
            FOR <span className="text-[#00ff88]">AI AGENT</span>
            {'\n'}PAYMENTS
          </h1>

          <p className="mb-8 max-w-md font-mono text-sm leading-relaxed text-[#666]">
            Deterministic compliance and security infrastructure for autonomous financial
            operations. Validating every machine-to-machine transaction in real-time.
          </p>

          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="rounded border border-[#00ff88] bg-[#00ff88] px-6 py-3 font-mono text-xs font-bold tracking-wider text-black transition-colors hover:bg-[#00ff88]/80"
            >
              INITIATE_PROTOCOL
            </Link>
            <Link
              href="#"
              className="rounded border border-[#333] bg-transparent px-6 py-3 font-mono text-xs font-bold tracking-wider text-white transition-colors hover:border-[#555]"
            >
              VIEW_SPEC_V2.0
            </Link>
          </div>
        </motion.div>

        {/* Right chart widget */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-sm rounded border border-[#2a3f52] bg-[#0d0d0d] p-6"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[13px] tracking-widest text-[#555]">FREESPOT_REGISTER</span>
          </div>
          <div className="mb-4 flex items-end gap-[3px]" style={{ height: 120 }}>
            {barData.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
                className="flex-1 rounded-sm bg-[#00ff88]/80"
              />
            ))}
          </div>
          <div className="flex items-center justify-between font-mono text-[13px] text-[#555]">
            <span>00:00:00</span>
            <span className="text-[#00ff88]">LIVE_TX_FEED</span>
            <span>4.2k TPS</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
