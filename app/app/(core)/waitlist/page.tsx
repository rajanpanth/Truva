"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [twitter, setTwitter] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCount(d.data.count);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!email) {
      setStatus("error");
      setMsg("EMAIL_REQUIRED");
      return;
    }
    if (!name) {
      setStatus("error");
      setMsg("NAME_REQUIRED");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, twitter, role: "EARLY_ACCESS" }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setPosition(data.data.position);
        setCount(data.data.position);
      } else {
        setStatus("error");
        setMsg(
          data.error === "Already on the waitlist"
            ? "ALREADY_REGISTERED"
            : data.error?.toUpperCase() || "SUBMISSION_FAILED"
        );
      }
    } catch {
      setStatus("error");
      setMsg("NETWORK_ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Subtle gradient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#14F195]/[0.03] blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-[#14F195]/[0.02] blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-[520px] relative z-10">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse" />
            <span className="text-[12px] font-bold tracking-[0.2em] text-[#14F195]">
              EARLY ACCESS
            </span>
          </div>
          <span className="text-[12px] font-mono tracking-[0.15em] text-zinc-600">
            TRUVA / V1
          </span>
        </div>

        {status === "success" ? (
          /* ── Success State ── */
          <div>
            <h1 className="text-[42px] md:text-[56px] font-black text-white leading-[1.05] tracking-tight mb-1">
              YOU&apos;RE IN
            </h1>
            <h2 className="text-[42px] md:text-[56px] font-black leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#14F195] to-[#0FBE76] mb-4">
              THE QUEUE
            </h2>
            <p className="text-[13px] font-mono tracking-[0.15em] text-zinc-500 mb-10">
              POSITION #{String(position).padStart(4, "0")} OF {count}
            </p>

            <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-lg p-5 font-mono text-[13px] mb-8">
              <div className="text-zinc-600">$ truva waitlist --status</div>
              <div className="text-[#14F195] mt-2">
                ✓ REGISTRATION_CONFIRMED
              </div>
              <div className="text-zinc-400 mt-1">
                QUEUE_POSITION: #{String(position).padStart(4, "0")}
              </div>
              <div className="text-zinc-400 mt-1">
                TOTAL_OPERATORS: {count}
              </div>
              <div className="text-zinc-600 mt-1">
                ETA: MAINNET_LAUNCH_Q3_2026
              </div>
              <span className="inline-block w-2 h-4 bg-[#14F195] animate-pulse mt-2" />
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[13px] font-mono tracking-[0.15em] text-zinc-500 hover:text-[#14F195] transition-colors"
            >
              <ArrowLeft size={14} />
              BACK_TO_PROTOCOL
            </Link>
          </div>
        ) : (
          /* ── Form ── */
          <div>
            <h1 className="text-[42px] md:text-[56px] font-black text-white leading-[1.05] tracking-tight mb-1">
              JOIN THE
            </h1>
            <h2 className="text-[42px] md:text-[56px] font-black leading-[1.05] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#14F195] to-[#0FBE76] mb-4">
              WAITLIST
            </h2>
            <p className="text-[13px] font-mono tracking-[0.15em] text-zinc-500 mb-10">
              BE FIRST TO BUILD ON TRUVA
            </p>

            {/* Name */}
            <div className="mb-6">
              <label className="block text-[12px] font-bold tracking-[0.2em] text-zinc-400 mb-2">
                NAME
              </label>
              <input
                type="text"
                placeholder="your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-4 py-4 text-[14px] font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-[#14F195]/40 transition-all"
              />
            </div>

            {/* Email */}
            <div className="mb-6">
              <label className="block text-[12px] font-bold tracking-[0.2em] text-zinc-400 mb-2">
                EMAIL
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-4 py-4 text-[14px] font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-[#14F195]/40 transition-all pr-10"
                />
                {email && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
                      <div className="w-5 h-5 rounded-full bg-[#14F195]/20 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#14F195" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Telegram */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-bold tracking-[0.2em] text-zinc-400">
                  TWITTER / X
                </label>
                <span className="text-[11px] font-mono tracking-[0.15em] text-zinc-600">
                  OPTIONAL
                </span>
              </div>
              <input
                type="text"
                placeholder="@ handle"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-4 py-4 text-[14px] font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-[#14F195]/40 transition-all"
              />
            </div>

            {/* Error */}
            {status === "error" && (
              <div className="text-[12px] font-bold tracking-[0.2em] text-red-400 mb-4">
                ⚠ {msg}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="w-full py-4 bg-zinc-800/80 border border-white/[0.06] rounded-lg text-[13px] font-mono font-bold tracking-[0.2em] text-zinc-300 hover:bg-zinc-700/80 hover:text-white hover:border-[#14F195]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
            >
              {status === "loading" ? (
                "PROCESSING..."
              ) : (
                <>
                  REQUEST ACCESS
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Count */}
            {count > 0 && (
              <div className="text-center text-[11px] font-mono tracking-[0.2em] text-zinc-700 mt-4">
                {count} OPERATOR{count !== 1 ? "S" : ""} ALREADY IN QUEUE
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-16">
          <Link
            href="/"
            className="text-[11px] font-mono tracking-[0.2em] text-zinc-600 hover:text-[#14F195] transition-colors"
          >
            TRUVA
          </Link>
          <span className="text-[11px] font-mono tracking-[0.2em] text-zinc-600">
            SOLANA
          </span>
        </div>
      </div>
    </div>
  );
}
