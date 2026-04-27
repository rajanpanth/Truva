/**
 * Truva Protocol — Reputation Engine Server
 *
 * Express server for the off-chain reputation scoring system.
 * Handles Helius webhooks, REST API, scoring, and on-chain tier updates.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { checkDbConnection, pool } from "./db/client";
import { runMigrations } from "./db/schema";
import { redis, checkRedisConnection } from "./cache/redis";

import agentRoutes from "./routes/agents";
import statsRoutes from "./routes/scores";
import heliusWebhook from "./webhooks/helius";

// ── Validate Environment Variables ──

interface EnvStatus {
  name: string;
  set: boolean;
  required: boolean;
  feature: string;
}

function validateEnv(): void {
  const vars: EnvStatus[] = [
    { name: "DATABASE_URL", set: !!process.env.DATABASE_URL, required: true, feature: "Database" },
    { name: "SOLANA_RPC_URL", set: !!process.env.SOLANA_RPC_URL, required: true, feature: "Solana" },
    { name: "TRUVA_PROGRAM_ID", set: !!process.env.TRUVA_PROGRAM_ID, required: true, feature: "Program" },
    { name: "REDIS_URL", set: !!process.env.REDIS_URL, required: false, feature: "Cache" },
    { name: "HELIUS_API_KEY", set: !!process.env.HELIUS_API_KEY, required: false, feature: "Webhooks" },
    { name: "HELIUS_WEBHOOK_SECRET", set: !!process.env.HELIUS_WEBHOOK_SECRET, required: false, feature: "Webhook auth" },
    { name: "BACKEND_AUTHORITY_KEY", set: !!process.env.BACKEND_AUTHORITY_KEY, required: false, feature: "Chain writes" },
    { name: "API_KEY", set: !!process.env.API_KEY, required: false, feature: "API auth" },
  ];

  console.log("\n  Environment:");
  for (const v of vars) {
    const icon = v.set ? "✅" : v.required ? "❌" : "⚠️ ";
    const status = v.set ? "configured" : `not set (${v.feature} disabled)`;
    console.log(`   ${icon} ${v.name} = ${status}`);
  }

  const missing = vars.filter((v) => v.required && !v.set);
  if (missing.length > 0) {
    console.error(`\n❌ Missing required: ${missing.map((v) => v.name).join(", ")}`);
    console.error("   Copy .env.example to .env and fill in the values.");
    process.exit(1);
  }
  console.log("");
}

// ── Auth Middleware ──

const API_KEY = process.env.API_KEY;

export function requireApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!API_KEY) {
    // No API key configured — allow all requests (dev mode)
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== API_KEY) {
    res.status(403).json({ success: false, error: "Invalid API key" });
    return;
  }

  next();
}

// ── Create Express App ──

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, try again later" },
});

const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many write requests" },
});

app.use("/api", apiLimiter);
app.use("/webhook", webhookLimiter);

// ── Health Check ──

app.get("/health", async (_req, res) => {
  const dbOk = await checkDbConnection();
  const redisOk = await checkRedisConnection();

  const status = dbOk ? "healthy" : "degraded";

  res.status(dbOk ? 200 : 503).json({
    success: true,
    data: {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? "connected" : "disconnected",
        redis: redisOk ? "connected" : "disconnected",
      },
    },
  });
});

// ── Mount Routes ──

app.use("/api/agents", agentRoutes);
app.use("/api/stats", statsRoutes);
app.use("/webhook", heliusWebhook);

// ── Error Handling Middleware ──

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
);

// ── 404 Handler ──

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// ── Graceful Shutdown ──

async function shutdown(signal: string): Promise<void> {
  console.log(`\n📛 ${signal} received — shutting down gracefully...`);

  try {
    await pool.end();
    console.log("   ✅ PostgreSQL pool closed");
  } catch (err) {
    console.error("   ❌ Error closing PostgreSQL pool:", err);
  }

  try {
    await redis.quit();
    console.log("   ✅ Redis disconnected");
  } catch (err) {
    console.error("   ❌ Error closing Redis:", err);
  }

  console.log("   👋 Goodbye\n");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Start Server ──

async function start(): Promise<void> {
  console.log("═══════════════════════════════════════════");
  console.log("  🛡️  Truva Reputation Engine");
  console.log("═══════════════════════════════════════════");

  validateEnv();

  // Connect to Redis
  try {
    await redis.connect();
    console.log("  ✅ Redis connected");
  } catch (err) {
    console.warn("  ⚠️  Redis not available — running without cache");
  }

  // Run database migrations
  try {
    await runMigrations();
    console.log("  ✅ Database ready");
  } catch (err) {
    console.error("  ❌ Database migration failed:", err);
    process.exit(1);
  }

  // Start listening
  app.listen(PORT, () => {
    console.log(`  ✅ Server running on http://localhost:${PORT}`);
    console.log(`     Health:  http://localhost:${PORT}/health`);
    console.log(`     API:     http://localhost:${PORT}/api/agents`);
    console.log(`     Stats:   http://localhost:${PORT}/api/stats`);
    console.log(`     Webhook: http://localhost:${PORT}/webhook/helius`);
    console.log("═══════════════════════════════════════════\n");
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

export { requireApiKey as authMiddleware, writeLimiter };
export default app;
