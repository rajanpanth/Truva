/**
 * Score / Stats Routes
 *
 * Aggregate statistics endpoints.
 */

import { Router, Request, Response } from "express";
import { query } from "../db/client";

const router = Router();

// ── GET /api/stats ──

router.get("/", async (_req: Request, res: Response) => {
  try {
    // Total agents
    const totalResult = await query(`SELECT COUNT(*) as total FROM agents`);
    const totalAgents = parseInt(totalResult.rows[0]?.total || "0", 10);

    // Average score
    const avgResult = await query(
      `SELECT COALESCE(AVG(current_score), 0) as avg_score FROM agents`
    );
    const avgScore = Math.round(parseFloat(avgResult.rows[0]?.avg_score || "0") * 10) / 10;

    // Tier distribution
    const tierResult = await query(
      `SELECT current_tier, COUNT(*) as count FROM agents GROUP BY current_tier ORDER BY 
       CASE current_tier 
         WHEN 'Platinum' THEN 1 
         WHEN 'Gold' THEN 2 
         WHEN 'Silver' THEN 3 
         WHEN 'Bronze' THEN 4 
       END`
    );

    const tierDistribution: Record<string, number> = {
      Platinum: 0,
      Gold: 0,
      Silver: 0,
      Bronze: 0,
    };
    for (const row of tierResult.rows) {
      tierDistribution[row.current_tier] = parseInt(row.count, 10);
    }

    // Total transactions
    const txResult = await query(`SELECT COUNT(*) as total FROM transactions`);
    const totalTransactions = parseInt(txResult.rows[0]?.total || "0", 10);

    // Success rate
    const successResult = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE success = true) as success_count,
         COUNT(*) as total_count
       FROM transactions`
    );
    const sr = successResult.rows[0] || {};
    const globalSuccessRate =
      parseInt(sr.total_count || "0", 10) > 0
        ? Math.round(
            (parseInt(sr.success_count || "0", 10) /
              parseInt(sr.total_count || "0", 10)) *
              1000
          ) / 1000
        : 0;

    res.json({
      success: true,
      data: {
        totalAgents,
        avgScore,
        tierDistribution,
        totalTransactions,
        globalSuccessRate,
      },
    });
  } catch (err: any) {
    console.error("GET /api/stats error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
