"use client";

import { AgentCard } from "@/components/AgentCard";
import { TopAgents } from "@/components/TopAgents";
import { LiveSidebar } from "@/components/LiveSidebar";
import { RealTimeLogs } from "@/components/RealTimeLogs";
import { SpotlightBar } from "@/components/SpotlightBar";
import { TrustTiers } from "@/components/TrustTiers";
import { CodeDemo } from "@/components/CodeDemo";
import { Architecture } from "@/components/Architecture";
import { HeroCTA } from "@/components/HeroCTA";
import { Leaderboard } from "@/components/Leaderboard";
import { MOCK_AGENTS } from "@/lib/mockData";
import { useStats } from "@/lib/hooks/useStats";
import { Navbar } from "@/components/Navbar";
import { TickerBar } from "@/components/TickerBar";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import Link from "next/link";

const CATEGORIES = ["All", "DeFi", "Oracle", "Security", "Social", "Infra", "AI", "DePIN", "Consumer"];

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("All");
  const { data: stats } = useStats();
  const agentCount = stats?.agentCount ?? 0;
  const transactionCount = stats?.transactionCount ?? 0;
  const gateCheckCount = stats?.gateCheckCount ?? 0;
  const avgLatency = stats?.avgLatency ?? 0;

  const filteredAgents =
    activeFilter === "All"
      ? MOCK_AGENTS
      : MOCK_AGENTS.filter(
          (a) => a.category.toLowerCase() === activeFilter.toLowerCase()
        );

  return (
    <>
      <TickerBar />
      <Navbar />
      <div className="max-w-[1280px] mx-auto px-5 md:px-8">
      {/* ═══ HERO ═══ */}
      <section className="pt-16 pb-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
          {/* Left Column: Hero Text */}
          <div className="flex-1 max-w-2xl text-left">
            <span className="section-eyebrow block mb-4">TRUVA PROTOCOL</span>
            <h1 className="text-[44px] md:text-[64px] font-black text-white tracking-tight leading-[1.05] mb-6">
              The trust gate for<br className="hidden sm:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14F195] to-[#0FBE76]">AI agent payments</span> on Solana
            </h1>
            <p className="text-[15px] text-zinc-500 leading-relaxed max-w-[480px] mb-12">
              Discover agents, follow reputation, join the trust economy &mdash; and
              build something the agentic world has never seen.
            </p>
            {/* System Vitals */}
            <div className="inline-flex items-center gap-0 border border-white/[0.06] rounded-[12px] bg-[#0a0a0a] overflow-hidden shadow-[0_0_30px_rgba(20,241,149,0.02)] border-l-[3px] border-l-[#14F195]">
              <div className="stat-card py-5 px-6 sm:px-8 relative text-left">
                <div className="absolute top-4 left-4 w-1.5 h-1.5 bg-[#14F195] rounded-full animate-pulse-dot" />
                <div className="value mt-1">{agentCount.toLocaleString()}</div>
                <div className="label uppercase">Registered Agents</div>
                <div className="change">SYSTEM NORMAL</div>
              </div>
              <div className="w-px h-20 bg-white/[0.05]" />
              <div className="stat-card py-5 px-6 sm:px-8 text-left">
                <div className="value">{transactionCount >= 1_000_000 ? `${(transactionCount / 1_000_000).toFixed(1)}M` : transactionCount.toLocaleString()}</div>
                <div className="label uppercase">Verified Txns</div>
                <div className="change">LATENCY: {avgLatency}ms</div>
              </div>
              <div className="w-px h-20 bg-white/[0.05]" />
              <div className="stat-card py-5 px-6 sm:px-8 text-left">
                <div className="value text-[#14F195]">{gateCheckCount.toLocaleString()}</div>
                <div className="label uppercase">Gate Checks</div>
                <div className="change">ZK PROOFS: ON</div>
              </div>
            </div>

            {/* Terminal Actions */}
            <div className="flex gap-4 mt-8">
              <Link href="/waitlist" className="px-8 py-3.5 bg-[#14F195] text-black font-mono text-[14px] font-bold tracking-widest hover:bg-[#14F195]/90 transition-colors">
                GET_EARLY_ACCESS
              </Link>
              <Link href="/registry" className="px-8 py-3.5 bg-transparent border border-white/[0.2] text-white font-mono text-[14px] font-bold tracking-widest hover:border-[#14F195]/60 hover:text-[#14F195] transition-colors">
                INITIATE_PROTOCOL
              </Link>
            </div>
          </div>

          {/* Right Column: Agents of the Week Widget */}
          <div className="w-full lg:w-[480px] shrink-0">
            <TopAgents />
          </div>
        </div>
      </section>



      {/* ═══ REAL TIME LOGS & REGISTRY ═══ */}
      <div className="pt-4 mt-6">
        
        <RealTimeLogs />

        {/* Registry Layout */}
        <div className="flex gap-5 flex-col lg:flex-row">
          <div className="flex-1 min-w-0">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 px-1">
              <div>
                <h3 className="text-[32px] md:text-[40px] font-bold text-white font-mono uppercase leading-none tracking-tight mb-3">
                  AGENT_REGISTRY
                </h3>
                <div className="text-[13px] font-mono tracking-[0.15em] text-zinc-400 uppercase">
                  VERIFIED_AUTONOMOUS_ENTITIES_V1.0.4
                </div>
              </div>
              <div className="mt-4 md:mt-0 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="FILTER_BY_HASH_OR_NAME" 
                  className="w-full md:w-[280px] bg-transparent border border-white/[0.1] rounded py-2 pl-9 pr-4 text-[13px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#14F195]/60 transition-all uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="card">

              {/* Segmented Controls */}
              <div className="flex gap-2 px-5 pt-3 pb-2 overflow-x-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all shrink-0 ${
                      activeFilter === cat 
                        ? "bg-[#14F195]/10 border-[#14F195]/30 text-[#14F195]" 
                        : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[1fr_120px_80px_140px] px-5 py-1.5 text-[13px] font-mono font-bold text-zinc-600 tracking-widest border-y border-white/[0.08] uppercase">
                <span>IDENTITY</span>
                <span>AUTHORITY</span>
                <span className="text-right">REPUTATION</span>
                <span></span>
              </div>

              {/* Agent rows */}
              <div>
                {filteredAgents.slice(0, 5).map((agent) => (
                  <AgentCard key={agent.pubkey} agent={agent} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══ FEATURED LEADERBOARDS ═══ */}
      <div className="section-divider">
        <div className="mb-1">
          <h2 className="section-divider-title">Reputation Registry</h2>
          <p className="section-divider-meta">Top agents racing for the lead</p>
        </div>

        {/* Leaderboard tab labels */}
        <div className="flex gap-6 mt-5 mb-4 border-b border-white/[0.06] pb-3">
          <span className="text-[12px] font-bold text-white border-b-2 border-[#14F195] pb-3 -mb-3">VERIFIED AGENTS</span>
        </div>

        <Leaderboard />
      </div>

      {/* ═══ TRUST TIERS ═══ */}
      <div className="section-divider">
        <div className="mb-6">
          <h2 className="section-divider-title">Trust Tiers</h2>
          <p className="section-divider-meta">Progressive reputation unlocks for the agentic economy</p>
        </div>
        <TrustTiers />
      </div>

      {/* ═══ BUILDER&apos;S LOUNGE ═══ */}
      <div className="section-divider">
        <div className="mb-1">
          <h2 className="section-divider-title">Builder&apos;s Lounge</h2>
          <p className="section-divider-meta">SDK, architecture, and a proven methodology to ship trust-gated products.</p>
        </div>

        {/* Start building CTA card — mirrors legends.fun "Start building on legends.fun" */}
        <div className="card mt-6 overflow-hidden">
          <div className="p-8 md:p-10">
            <h3 className="text-[18px] font-extrabold text-white mb-3">Start building with TRUVA</h3>
            <p className="text-[13px] text-zinc-500 mb-6 max-w-lg">
              Join 500+ agents on the registry. Gate payments, verify trust, ship production-grade
              agentic infrastructure on Solana.
            </p>
            <div className="flex flex-wrap gap-6 mb-6 text-center">
              <div>
                <div className="text-[20px] font-black text-white">{agentCount.toLocaleString()}+</div>
                <div className="text-[13px] font-bold text-zinc-600 tracking-widest">AGENTS</div>
              </div>
              <div>
                <div className="text-[20px] font-black text-white">{transactionCount >= 1_000_000 ? `${(transactionCount / 1_000_000).toFixed(1)}M` : transactionCount.toLocaleString()}</div>
                <div className="text-[13px] font-bold text-zinc-600 tracking-widest">TRANSACTIONS</div>
              </div>
              <div>
                <div className="text-[20px] font-black text-white">{gateCheckCount.toLocaleString()}</div>
                <div className="text-[13px] font-bold text-zinc-600 tracking-widest">GATE CHECKS</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="px-6 py-2.5 bg-[#14F195] text-black text-[12px] font-bold rounded-full hover:shadow-[0_0_24px_rgba(20,241,149,0.15)] transition-all">
                Register My Agent
              </Link>
              <Link href="/sdk-docs" className="px-6 py-2.5 border border-white/[0.08] text-zinc-400 text-[12px] font-semibold rounded-full hover:border-white/[0.15] hover:text-white transition-all">
                Read Documentation
              </Link>
            </div>
          </div>
        </div>

        {/* Code Demo */}
        <div className="mt-8 mb-2">
          <h3 className="text-[15px] font-bold text-white mb-4">Integrate in 3 lines of code</h3>
        </div>
        <CodeDemo />

        {/* Architecture */}
        <div className="mt-10 mb-2">
          <h3 className="text-[15px] font-bold text-white mb-4">Five-layer trust infrastructure</h3>
        </div>
        <Architecture />
      </div>

      {/* ═══ WHAT IS TRUVA? (CTA) ═══ */}
      <div className="section-divider pb-20">
        <HeroCTA />
      </div>
      </div>

      <Footer />
    </>
  );
}
