/**
 * Agent Routes
 *
 * CRUD endpoints for agents and their associated data.
 * All routes return JSON with shape: { success, data, error }
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { query } from "../db/client";
import { recalculateScore } from "../services/scorer";
import { backfillAgent } from "../services/backfill";
import { getCachedScore } from "../cache/redis";
import { requireApiKey, writeLimiter } from "../middleware";

const router = Router();

// ── Validation Schemas ──

const pubkeySchema = z.string().min(32).max(44);

const registerSchema = z.object({
  pubkey: pubkeySchema,
});

// Full registration schema — matches the Next.js app registerAgentFullSchema
const fullRegisterSchema = z.object({
  pubkey: pubkeySchema.optional(),
  public_key: pubkeySchema.optional(),
  name: z.string().min(2).max(64).optional(),
  operator_name: z.string().min(2).max(100).optional(),
  operator_email: z.string().email().optional(),
  task_type: z.string().optional(),
  description: z.string().max(500).optional(),
  max_tx_size: z.number().min(1).optional(),
  rate_limit: z.number().min(1).optional(),
  chains: z.array(z.string()).min(1).optional(),
  spending_behavior: z.string().optional(),
  metadata: z.unknown().optional(),
}).refine((d) => d.pubkey || d.public_key, {
  message: "pubkey or public_key is required",
});

const attestSchema = z.object({
  validator_pubkey: pubkeySchema,
});

const zkProofSchema = z.object({
  proof_hash: z.string().min(1).max(88),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ── GET /api/agents ──

router.get("/", async (req: Request, res: Response) => {
  try {
    const tierFilter = req.query.tier as string | undefined;

    let sql = `SELECT pubkey, registered_at, current_tier, current_score, last_updated FROM agents`;
    const params: any[] = [];

    if (tierFilter) {
      sql += ` WHERE current_tier = $1`;
      params.push(tierFilter);
    }

    sql += ` ORDER BY current_score DESC`;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error("GET /api/agents error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/agents ── (SDK entry point — accepts full registration payload)

router.post("/", writeLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = fullRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parsed.error.issues,
      });
      return;
    }

    const pubkey = (parsed.data.pubkey || parsed.data.public_key) as string;

    // Check if already registered
    const existing = await query(
      `SELECT pubkey FROM agents WHERE pubkey = $1`,
      [pubkey]
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: "Agent already registered" });
      return;
    }

    // Register agent in reputation engine DB
    await query(`INSERT INTO agents (pubkey) VALUES ($1)`, [pubkey]);

    // Trigger historical backfill asynchronously
    backfillAgent(pubkey).catch((err: any) => {
      console.error(`Background backfill failed for ${pubkey}:`, err);
    });

    res.status(201).json({
      success: true,
      data: {
        pubkey,
        registered_at: new Date().toISOString(),
        current_tier: "Bronze",
        current_score: 0,
        message: "Agent registered. Historical backfill started in background.",
      },
    });
  } catch (err: any) {
    console.error("POST /api/agents error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/agents/:pubkey ──

router.get("/:pubkey", async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const parsed = pubkeySchema.safeParse(pubkey);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid pubkey format" });
      return;
    }

    const agentResult = await query(
      `SELECT pubkey, registered_at, current_tier, current_score, last_updated FROM agents WHERE pubkey = $1`,
      [pubkey]
    );

    if (agentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const agent = agentResult.rows[0];

    // Get transaction stats
    const txStats = await query(
      `SELECT 
         COUNT(*) as tx_count,
         COUNT(*) FILTER (WHERE success = true) as success_count,
         COUNT(DISTINCT counterparty) FILTER (WHERE counterparty IS NOT NULL) as unique_counterparties,
         COALESCE(SUM(volume), 0) as total_volume
       FROM transactions WHERE agent_pubkey = $1`,
      [pubkey]
    );

    // Get ZK proof count
    const zkCount = await query(
      `SELECT COUNT(*) as count FROM zk_proofs WHERE agent_pubkey = $1`,
      [pubkey]
    );

    // Get attestation count
    const attestCount = await query(
      `SELECT COUNT(*) as count FROM attestations WHERE agent_pubkey = $1`,
      [pubkey]
    );

    const stats = txStats.rows[0] || {};
    const txCount = parseInt(stats.tx_count || "0", 10);
    const successCount = parseInt(stats.success_count || "0", 10);

    const profile = {
      ...agent,
      tx_count: txCount,
      success_count: successCount,
      success_rate: txCount > 0 ? Math.round((successCount / txCount) * 1000) / 1000 : 0,
      unique_counterparties: parseInt(stats.unique_counterparties || "0", 10),
      total_volume: parseInt(stats.total_volume || "0", 10),
      zk_proof_count: parseInt(zkCount.rows[0]?.count || "0", 10),
      attestation_count: parseInt(attestCount.rows[0]?.count || "0", 10),
    };

    res.json({ success: true, data: profile });
  } catch (err: any) {
    console.error("GET /api/agents/:pubkey error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/agents/register ──

router.post("/register", writeLimiter, requireApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parsed.error.issues,
      });
      return;
    }

    const { pubkey } = parsed.data;

    // Check if already registered
    const existing = await query(
      `SELECT pubkey FROM agents WHERE pubkey = $1`,
      [pubkey]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({ success: false, error: "Agent already registered" });
      return;
    }

    // Register agent
    await query(
      `INSERT INTO agents (pubkey) VALUES ($1)`,
      [pubkey]
    );

    // Trigger backfill asynchronously — don't block the response
    backfillAgent(pubkey).catch((err) => {
      console.error(`Background backfill failed for ${pubkey}:`, err);
    });

    res.status(201).json({
      success: true,
      data: {
        pubkey,
        registered_at: new Date().toISOString(),
        current_tier: "Bronze",
        current_score: 0,
        message: "Agent registered. Historical backfill started in background.",
      },
    });
  } catch (err: any) {
    console.error("POST /api/agents/register error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/agents/:pubkey/score ──

router.get("/:pubkey/score", async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    // Try cache first
    const cached = await getCachedScore(pubkey);
    if (cached) {
      res.json({ success: true, data: cached, source: "cache" });
      return;
    }

    // Fall back to DB
    const result = await query(
      `SELECT current_score, current_tier FROM agents WHERE pubkey = $1`,
      [pubkey]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        score: row.current_score,
        tier: row.current_tier,
      },
      source: "db",
    });
  } catch (err: any) {
    console.error("GET /api/agents/:pubkey/score error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/agents/:pubkey/history ──

router.get("/:pubkey/history", async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;

    const result = await query(
      `SELECT score, tier, recorded_at FROM score_history 
       WHERE agent_pubkey = $1 
       ORDER BY recorded_at DESC 
       LIMIT 100`,
      [pubkey]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error("GET /api/agents/:pubkey/history error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── GET /api/agents/:pubkey/txs ──

router.get("/:pubkey/txs", async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const pagination = paginationSchema.safeParse(req.query);
    const { page, limit } = pagination.success
      ? pagination.data
      : { page: 1, limit: 20 };

    const offset = (page - 1) * limit;

    const [txResult, countResult] = await Promise.all([
      query(
        `SELECT id, tx_hash, success, counterparty, volume, timestamp, created_at
         FROM transactions 
         WHERE agent_pubkey = $1 
         ORDER BY timestamp DESC 
         LIMIT $2 OFFSET $3`,
        [pubkey, limit, offset]
      ),
      query(
        `SELECT COUNT(*) as total FROM transactions WHERE agent_pubkey = $1`,
        [pubkey]
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    res.json({
      success: true,
      data: {
        transactions: txResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error("GET /api/agents/:pubkey/txs error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/agents/:pubkey/attest ──

router.post("/:pubkey/attest", writeLimiter, requireApiKey, async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const parsed = attestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parsed.error.issues,
      });
      return;
    }

    // Verify agent exists
    const agentResult = await query(
      `SELECT pubkey FROM agents WHERE pubkey = $1`,
      [pubkey]
    );
    if (agentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    // Insert attestation
    await query(
      `INSERT INTO attestations (agent_pubkey, validator_pubkey) VALUES ($1, $2)`,
      [pubkey, parsed.data.validator_pubkey]
    );

    // Recalculate score async
    recalculateScore(pubkey).catch((err) => {
      console.error(`Score recalculation failed after attestation for ${pubkey}:`, err);
    });

    res.status(201).json({
      success: true,
      data: { message: "Attestation recorded", agent: pubkey },
    });
  } catch (err: any) {
    console.error("POST /api/agents/:pubkey/attest error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /api/agents/:pubkey/zkproof ──

router.post("/:pubkey/zkproof", writeLimiter, requireApiKey, async (req: Request, res: Response) => {
  try {
    const { pubkey } = req.params;
    const parsed = zkProofSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: parsed.error.issues,
      });
      return;
    }

    // Verify agent exists
    const agentResult = await query(
      `SELECT pubkey FROM agents WHERE pubkey = $1`,
      [pubkey]
    );
    if (agentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: "Agent not found" });
      return;
    }

    // Insert ZK proof
    await query(
      `INSERT INTO zk_proofs (agent_pubkey, proof_hash) VALUES ($1, $2)`,
      [pubkey, parsed.data.proof_hash]
    );

    // Recalculate score async
    recalculateScore(pubkey).catch((err) => {
      console.error(`Score recalculation failed after ZK proof for ${pubkey}:`, err);
    });

    res.status(201).json({
      success: true,
      data: { message: "ZK proof recorded", agent: pubkey },
    });
  } catch (err: any) {
    console.error("POST /api/agents/:pubkey/zkproof error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
