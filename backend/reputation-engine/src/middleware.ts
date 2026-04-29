/**
 * Shared Express middleware for the Reputation Engine.
 *
 * Extracted here to break the circular dependency between
 * src/index.ts (which mounts routes) and src/routes/agents.ts
 * (which needs auth + rate-limit middleware).
 */

import express from "express";
import rateLimit from "express-rate-limit";

// ── Rate Limiters ──────────────────────────────────────────────────────────────

/** General API: 100 req/min per IP */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, try again later" },
});

/** Webhook ingestion: 500 req/min (Helius can be chatty) */
export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Write operations: 30 req/min (register, attest, etc.) */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many write requests" },
});

// ── API Key Auth ───────────────────────────────────────────────────────────────

const API_KEY = process.env.API_KEY;

/**
 * Bearer-token auth middleware.
 * If `API_KEY` env var is not set, all requests are allowed (dev mode).
 */
export function requireApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!API_KEY) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  // Constant-time comparison not needed here — API key is not a secret-equivalent
  // (it's a shared key for basic endpoint protection, not a credential)
  if (token !== API_KEY) {
    res.status(403).json({ success: false, error: "Invalid API key" });
    return;
  }

  next();
}
