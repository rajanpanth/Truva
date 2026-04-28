"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Zap, Users, Lock } from "lucide-react";
import "./waitlist.css";

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [twitter, setTwitter] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCount(d.data.count);
      })
      .catch(() => {});
  }, []);

  /* ── Particle canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(20, 241, 149, ${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleSubmit = async () => {
    if (!email) {
      setStatus("error");
      setMsg("Please enter your email address");
      return;
    }
    if (!name) {
      setStatus("error");
      setMsg("Please enter your name");
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
            ? "You're already on the waitlist!"
            : data.error || "Something went wrong. Please try again."
        );
      }
    } catch {
      setStatus("error");
      setMsg("Network error — please try again later");
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="waitlist-page">
      {/* Background canvas */}
      <canvas ref={canvasRef} className="waitlist-canvas" />

      {/* Gradient orbs */}
      <div className="waitlist-orb waitlist-orb-1" />
      <div className="waitlist-orb waitlist-orb-2" />
      <div className="waitlist-orb waitlist-orb-3" />

      {/* Grid overlay */}
      <div className="waitlist-grid-overlay" />

      <div className="waitlist-container">
        {/* Left: Visual hero */}
        <div className="waitlist-hero">
          <div className="waitlist-hero-content">
            {/* Orbital rings */}
            <div className="waitlist-orbital">
              <div className="waitlist-ring waitlist-ring-1" />
              <div className="waitlist-ring waitlist-ring-2" />
              <div className="waitlist-ring waitlist-ring-3" />
              <div className="waitlist-core">
                <img src="/mainlogo.png" alt="Truva" className="waitlist-core-logo" />
              </div>
              {/* Orbiting dots */}
              <div className="waitlist-orbit-dot waitlist-orbit-dot-1" />
              <div className="waitlist-orbit-dot waitlist-orbit-dot-2" />
              <div className="waitlist-orbit-dot waitlist-orbit-dot-3" />
            </div>

            <h1 className="waitlist-hero-title">
              The Trust Layer
              <br />
              <span className="waitlist-hero-accent">for AI Agents</span>
            </h1>
            <p className="waitlist-hero-desc">
              On-chain verification, reputation scoring, and programmable trust gates — built natively on Solana.
            </p>

            {/* Stats row */}
            <div className="waitlist-stats">
              <div className="waitlist-stat">
                <Zap size={14} />
                <span>Sub-second verification</span>
              </div>
              <div className="waitlist-stat">
                <Lock size={14} />
                <span>On-chain trust scores</span>
              </div>
              <div className="waitlist-stat">
                <Users size={14} />
                <span>{count > 0 ? `${count} in queue` : "Join early"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form card */}
        <div className="waitlist-form-wrapper">
          <div className="waitlist-card">
            {/* Card header */}
            <div className="waitlist-card-header">
              <div className="waitlist-card-badge">
                <div className="waitlist-pulse-dot" />
                Early Access
              </div>
              <span className="waitlist-card-version">v1.0</span>
            </div>

            {status === "success" ? (
              /* ── Success State ── */
              <div className="waitlist-success">
                <div className="waitlist-success-icon">
                  <div className="waitlist-success-ring" />
                  <Check size={32} strokeWidth={2.5} />
                </div>
                <h2 className="waitlist-success-title">You&apos;re on the list!</h2>
                <p className="waitlist-success-position">
                  Position <span>#{String(position).padStart(4, "0")}</span>
                </p>
                <div className="waitlist-success-details">
                  <div className="waitlist-success-row">
                    <span>Queue position</span>
                    <span>#{String(position).padStart(4, "0")}</span>
                  </div>
                  <div className="waitlist-success-row">
                    <span>Total signups</span>
                    <span>{count}</span>
                  </div>
                  <div className="waitlist-success-row">
                    <span>Expected launch</span>
                    <span>Q3 2026</span>
                  </div>
                </div>
                <p className="waitlist-success-note">
                  We&apos;ll reach out when your spot is ready. Follow us on X for updates.
                </p>
                <Link href="/" className="waitlist-back-link">
                  <ArrowLeft size={14} />
                  Back to home
                </Link>
              </div>
            ) : (
              /* ── Form ── */
              <div className="waitlist-form">
                <h2 className="waitlist-form-title">Request early access</h2>
                <p className="waitlist-form-subtitle">
                  Be among the first developers to build on Truva Protocol.
                </p>

                {/* Name */}
                <div className={`waitlist-field ${focusedField === "name" ? "focused" : ""}`}>
                  <label htmlFor="waitlist-name">Name</label>
                  <input
                    id="waitlist-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                {/* Email */}
                <div className={`waitlist-field ${focusedField === "email" ? "focused" : ""}`}>
                  <label htmlFor="waitlist-email">Email</label>
                  <div className="waitlist-field-input-wrap">
                    <input
                      id="waitlist-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                    {email && (
                      <div className={`waitlist-email-indicator ${isValidEmail ? "valid" : "invalid"}`}>
                        {isValidEmail ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          <span>×</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Twitter */}
                <div className={`waitlist-field ${focusedField === "twitter" ? "focused" : ""}`}>
                  <div className="waitlist-field-label-row">
                    <label htmlFor="waitlist-twitter">Twitter / X</label>
                    <span className="waitlist-optional">Optional</span>
                  </div>
                  <input
                    id="waitlist-twitter"
                    type="text"
                    placeholder="@handle"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    onFocus={() => setFocusedField("twitter")}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>

                {/* Error */}
                {status === "error" && (
                  <div className="waitlist-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {msg}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  className="waitlist-submit"
                >
                  {status === "loading" ? (
                    <div className="waitlist-spinner" />
                  ) : (
                    <>
                      Request Access
                      <ArrowRight size={16} className="waitlist-submit-arrow" />
                    </>
                  )}
                </button>

                {count > 0 && (
                  <p className="waitlist-count">
                    <span className="waitlist-count-dot" />
                    {count} developer{count !== 1 ? "s" : ""} already joined
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="waitlist-footer">
            <Link href="/" className="waitlist-footer-link">
              ← truva.protocol
            </Link>
            <span className="waitlist-footer-chain">Solana</span>
          </div>
        </div>
      </div>
    </div>
  );
}
