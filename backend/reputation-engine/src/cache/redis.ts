import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 5) {
      console.error("Redis: max retries reached, giving up");
      return null;
    }
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("connect", () => {
  console.log("📡 Redis connected");
});

/**
 * Check if Redis is connected and responsive
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

// ── Score cache helpers ──

const SCORE_CACHE_TTL = 300; // 5 minutes
const SCORE_PREFIX = "truva:score:";

export interface CachedScore {
  score: number;
  tier: string;
  txCount: number;
  successRate: number;
  updatedAt: string;
}

/**
 * Get cached score for an agent
 */
export async function getCachedScore(pubkey: string): Promise<CachedScore | null> {
  try {
    const raw = await redis.get(`${SCORE_PREFIX}${pubkey}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedScore;
  } catch {
    return null;
  }
}

/**
 * Set cached score for an agent
 */
export async function setCachedScore(pubkey: string, score: CachedScore): Promise<void> {
  try {
    await redis.setex(
      `${SCORE_PREFIX}${pubkey}`,
      SCORE_CACHE_TTL,
      JSON.stringify(score)
    );
  } catch (err) {
    console.error("Failed to cache score:", err);
  }
}

/**
 * Invalidate cached score for an agent
 */
export async function invalidateScore(pubkey: string): Promise<void> {
  try {
    await redis.del(`${SCORE_PREFIX}${pubkey}`);
  } catch (err) {
    console.error("Failed to invalidate score cache:", err);
  }
}
