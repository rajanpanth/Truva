/**
 * Truva Protocol — Reputation Engine Server
 *
 * Express server for the off-chain reputation scoring system.
 * Handles Helius webhooks, REST API, scoring, and on-chain tier updates.
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { Connection } from "@solana/web3.js";

import { logger } from "./logger";
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

  for (const v of vars) {
    const status = v.set ? "configured" : `not set (${v.feature} disabled)`;
    logger.debug({ var: v.name, configured: v.set, required: v.required }, status);
  }

  const missing = vars.filter((v) => v.required && !v.set);
  if (missing.length > 0) {
    logger.fatal({ missing: missing.map((v) => v.name) }, "Missing required environment variables. Copy .env.example to .env");
    process.exit(1);
  }
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
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== "test" }));
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

async function checkSolanaRpc(): Promise<boolean> {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) return false;
  try {
    const conn = new Connection(rpcUrl, "processed");
    await conn.getVersion();
    return true;
  } catch {
    return false;
  }
}

app.get("/health", async (_req, res) => {
  const [dbOk, redisOk, solanaOk] = await Promise.all([
    checkDbConnection(),
    checkRedisConnection(),
    checkSolanaRpc(),
  ]);

  const healthy = dbOk && solanaOk;
  const status = healthy ? "healthy" : "degraded";

  res.status(healthy ? 200 : 503).json({
    success: true,
    data: {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? "connected" : "disconnected",
        redis: redisOk ? "connected" : "disconnected",
        solana: solanaOk ? "reachable" : "unreachable",
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
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
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
  logger.info({ signal }, "Shutdown signal received — draining connections");

  try {
    await pool.end();
    logger.info("PostgreSQL pool closed");
  } catch (err) {
    logger.error({ err }, "Error closing PostgreSQL pool");
  }

  try {
    await redis.quit();
    logger.info("Redis disconnected");
  } catch (err) {
    logger.error({ err }, "Error closing Redis");
  }

  logger.info("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Start Server ──

async function start(): Promise<void> {
  logger.info("Truva Reputation Engine starting");

  validateEnv();

  // Connect to Redis
  try {
    await redis.connect();
    logger.info("Redis connected");
  } catch (err) {
    logger.warn({ err }, "Redis not available — running without cache");
  }

  // Run database migrations
  try {
    await runMigrations();
    logger.info("Database migrations complete");
  } catch (err) {
    logger.fatal({ err }, "Database migration failed");
    process.exit(1);
  }

  // Start listening
  app.listen(PORT, () => {
    logger.info(
      { port: PORT, health: `/health`, api: `/api/agents`, webhook: `/webhook/helius` },
      `Server listening on port ${PORT}`
    );
  });
}

start().catch((err) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});

export { requireApiKey as authMiddleware, writeLimiter };
export default app;
