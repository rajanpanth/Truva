'use client';

import { Shield, Lock, ChevronDown } from 'lucide-react';

export function PassportSection() {
  return (
    <section className="border-t border-[#2a3f52] bg-[#0a0a0a] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-[#00ff88]" />
          <div>
            <h2 className="font-mono text-2xl font-bold text-white">TRADEBOT X &nbsp;PASSPORT</h2>
            <p className="font-mono text-[13px] tracking-widest text-[#555]">REPUTATION_STAMP_ID: AF-9283-TR-001</p>
          </div>
        </div>

        {/* Metrics row */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'RELIABILITY', value: '99.98%' },
            { label: 'LATENCY_AVG', value: '4.2ms' },
            { label: 'COMPLIANCE', value: '100%' },
          ].map((m) => (
            <div key={m.label} className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-5">
              <p className="mb-1 font-mono text-[13px] tracking-widest text-[#555]">{m.label}</p>
              <p className="font-mono text-3xl font-bold text-white">{m.value}</p>
              <div className="mt-2 h-1.5 w-full bg-[#00ff88]/30">
                <div className="h-full bg-[#00ff88]" style={{ width: '100%' }} />
              </div>
            </div>
          ))}
          <div className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-5 text-center">
            <Shield className="mx-auto mb-2 h-10 w-10 text-[#00ff88]" />
            <p className="font-mono text-[13px] tracking-widest text-[#555]">STAKED_REPUTATION</p>
            <p className="font-mono text-2xl font-bold text-[#00ff88]">500,000 TRU</p>
          </div>
        </div>

        {/* Compliance manifesto */}
        <div className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-6">
          <h3 className="mb-4 font-mono text-xs font-bold tracking-widest text-white">COMPLIANCE_MANIFESTO_V.2</h3>
          <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4">
            <div>
              <p className="font-mono text-[13px] text-[#555]">KYC_STATUS</p>
              <p className="font-mono text-sm font-bold text-[#00ff88]">VERIFIED</p>
            </div>
            <div>
              <p className="font-mono text-[13px] text-[#555]">OPERATING_LIMIT</p>
              <p className="font-mono text-sm font-bold text-white">$18.8M DAILY</p>
            </div>
            <div>
              <p className="font-mono text-[13px] text-[#555]">JURISDICTION</p>
              <p className="font-mono text-sm font-bold text-white">GLOBAL_MESH</p>
            </div>
            <div>
              <p className="font-mono text-[13px] text-[#555]">LAST_AUDIT</p>
              <p className="font-mono text-sm font-bold text-white">2026-04-29</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const tiers = [
  { name: 'BRONZE', desc: 'Testnet operations only.', active: true },
  { name: 'SILVER', desc: 'For Low Stake Routing.', active: false },
  { name: 'GOLD', desc: 'For Mid-Tier Operations.', active: false },
];

export function RegisterForm() {
  return (
    <>
      <PassportSection />
      <section className="border-t border-[#2a3f52] bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          {/* Left form */}
          <div>
            <h2 className="mb-2 font-mono text-3xl font-extrabold text-white">REGISTER_YOUR_AGENT</h2>
            <p className="mb-8 max-w-md font-mono text-xs leading-relaxed text-[#555]">
              Onboard your autonomous system to the Truva Protocol. Requires valid public keys and compliance documentation for tier assignment.
            </p>

            <div className="space-y-5">
              <div>
                <label className="mb-1 block font-mono text-[13px] tracking-widest text-[#555]">AGENT_ENTITY_NAME</label>
                <input
                  type="text"
                  placeholder="e.g. ALPHA_LIQUIDITY_BOT"
                  className="w-full rounded border border-[#2a3f52] bg-[#111] px-4 py-3 font-mono text-xs text-white placeholder:text-[#333] focus:border-[#00ff88] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[13px] tracking-widest text-[#555]">PUBLIC_KEY_HEX (ED25519)</label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full rounded border border-[#2a3f52] bg-[#111] px-4 py-3 font-mono text-xs text-white placeholder:text-[#333] focus:border-[#00ff88] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[13px] tracking-widest text-[#555]">DEPLOYMENT_CATEGORY</label>
                <div className="relative">
                  <select className="w-full appearance-none rounded border border-[#2a3f52] bg-[#111] px-4 py-3 font-mono text-xs text-white focus:border-[#00ff88] focus:outline-none">
                    <option>FINANCIAL_ARBITRAGE</option>
                    <option>TRADING</option>
                    <option>LENDING</option>
                    <option>BRIDGE</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                </div>
              </div>

              <button className="w-full rounded bg-[#00ff88] py-3 font-mono text-xs font-bold tracking-wider text-black transition-colors hover:bg-[#00ff88]/80">
                INITIATE_ONBOARDING_SEQUENCE
              </button>
            </div>
          </div>

          {/* Right tier progression */}
          <div>
            <div className="rounded border border-[#2a3f52] bg-[#0d0d0d] p-6">
              <h3 className="mb-6 font-mono text-xs font-bold tracking-widest text-white">TIER_PROGRESSION</h3>
              <div className="space-y-4">
                {tiers.map((tier) => (
                  <div key={tier.name} className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${tier.active ? 'bg-[#00ff88]' : 'bg-[#333]'}`} />
                    <div>
                      <p className={`font-mono text-xs font-bold ${tier.active ? 'text-[#00ff88]' : 'text-[#555]'}`}>
                        {tier.name}
                      </p>
                      <p className="font-mono text-[13px] text-[#444]">{tier.desc}</p>
                    </div>
                    {!tier.active && <Lock className="ml-auto h-3 w-3 text-[#333]" />}
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded border border-[#2a3f52] bg-[#111] p-4">
                <p className="font-mono text-[13px] leading-relaxed text-[#555]">
                  NOTE: ALL REGISTRATION REQUESTS ARE SUBJECT TO A 24-CYCLE VALIDATION PERIOD BY THE TRUVA CONSENSUS ENGINE.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
