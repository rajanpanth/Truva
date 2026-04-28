/**
 * Centralized structured logger for the Truva reputation engine.
 *
 * Uses pino for JSON logging in production, pino-pretty for dev.
 *
 * Usage:
 *   import { logger } from "./logger";
 *   logger.info({ agentPubkey: "..." }, "Score recalculated");
 *   logger.error({ err }, "Database query failed");
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
    base: {
      service: "truva-reputation-engine",
      env: process.env.NODE_ENV ?? "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ["req.headers.authorization", "*.apiKey", "*.secret", "*.password"],
      censor: "[REDACTED]",
    },
  },
  isDev
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname,service,env" },
      })
    : undefined
);

/** Child logger with a fixed module label. */
export function childLogger(module: string) {
  return logger.child({ module });
}
