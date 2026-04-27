/**
 * Helius Webhook Handler
 *
 * Receives transaction notifications from Helius, extracts relevant data,
 * stores in PostgreSQL, and triggers async score recalculation.
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { query } from "../db/client";
import { recalculateScore } from "../services/scorer";

const router = Router();

const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || "";

/**
 * Validate Helius webhook signature
 */
function validateSignature(body: string, signature: string): boolean {
  if (!HELIUS_WEBHOOK_SECRET) {
    console.warn("⚠️  HELIUS_WEBHOOK_SECRET not set — skipping signature validation");
    return true;
  }

  const hmac = crypto.createHmac("sha256", HELIUS_WEBHOOK_SECRET);
  hmac.update(body);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Extract agent-relevant data from a Helius transaction
 */
function extractTransactionData(tx: any): {
  agentPubkey: string | null;
  success: boolean;
  counterparty: string | null;
  volume: number;
  timestamp: number;
  signature: string;
} | null {
  try {
    const signature = tx.signature || tx.txSignature || "";
    const success = !tx.meta?.err && tx.transactionError === null;
    const timestamp = tx.timestamp || Math.floor(Date.now() / 1000);

    // Get account keys
    const accountKeys: string[] = tx.accountData?.map((a: any) => a.account) ||
      tx.accountKeys || [];

    if (accountKeys.length === 0) return null;

    // First account is typically the fee payer / agent
    const agentPubkey = accountKeys[0] || null;
    const counterparty = accountKeys.length > 1 ? accountKeys[1] : null;

    // Extract volume from native transfers
    let volume = 0;
    if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
      volume = tx.nativeTransfers.reduce(
        (sum: number, t: any) => sum + (t.amount || 0),
        0
      );
    }

    return { agentPubkey, success, counterparty, volume, timestamp, signature };
  } catch {
    return null;
  }
}

/**
 * POST /webhook/helius
 *
 * Handles array of transactions in a single webhook call.
 * Responds 200 immediately — processing happens async.
 */
router.post("/helius", async (req: Request, res: Response) => {
  try {
    // Validate webhook signature
    const signature = (req.headers["x-helius-signature"] as string) || "";
    const rawBody = JSON.stringify(req.body);

    if (HELIUS_WEBHOOK_SECRET && !validateSignature(rawBody, signature)) {
      console.warn("⚠️  Invalid webhook signature rejected");
      res.status(401).json({ success: false, error: "Invalid signature" });
      return;
    }

    // Handle both single transaction and array
    const transactions = Array.isArray(req.body) ? req.body : [req.body];

    // Respond 200 immediately — never block on processing
    res.status(200).json({ success: true, received: transactions.length });

    // Process async
    const agentsToRecalculate = new Set<string>();

    for (const tx of transactions) {
      const data = extractTransactionData(tx);
      if (!data || !data.agentPubkey || !data.signature) continue;

      // Check if agent is registered
      try {
        const agentResult = await query(
          `SELECT pubkey FROM agents WHERE pubkey = $1`,
          [data.agentPubkey]
        );

        if (agentResult.rows.length === 0) {
          // Agent not registered — skip
          continue;
        }

        // Upsert transaction (skip duplicates via tx_hash unique constraint)
        await query(
          `INSERT INTO transactions (agent_pubkey, tx_hash, success, counterparty, volume, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tx_hash) DO NOTHING`,
          [
            data.agentPubkey,
            data.signature,
            data.success,
            data.counterparty,
            data.volume,
            data.timestamp,
          ]
        );

        agentsToRecalculate.add(data.agentPubkey);
      } catch (err) {
        console.error(`Error processing webhook tx ${data.signature}:`, err);
      }
    }

    // Trigger recalculation for all affected agents
    for (const pubkey of agentsToRecalculate) {
      try {
        await recalculateScore(pubkey);
      } catch (err) {
        console.error(`Error recalculating score for ${pubkey}:`, err);
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // If we haven't responded yet
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Internal error" });
    }
  }
});

export default router;
