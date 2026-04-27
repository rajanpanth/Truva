/**
 * Historical Backfill Service
 *
 * Fetches historical transaction signatures for an agent using
 * getSignaturesForAddress(), parses each batch immediately (streaming),
 * and upserts into the transactions table without accumulating in memory.
 *
 * Called automatically when a new agent registers.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { query } from "../db/client";
import { recalculateScore } from "./scorer";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const BATCH_SIZE = 1000;
const BATCH_DELAY_MS = 500;

/**
 * Backfill all historical transactions for an agent.
 * Uses streaming: processes each batch immediately instead of
 * collecting all signatures into memory first.
 */
export async function backfillAgent(agentPubkey: string): Promise<void> {
  console.log(`🔄 Starting backfill for agent: ${agentPubkey}`);

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const agentKey = new PublicKey(agentPubkey);

  let beforeSig: string | undefined = undefined;
  let batchCount = 0;
  let totalProcessed = 0;
  let totalInserted = 0;

  try {
    // Stream through signatures batch by batch — no memory accumulation
    while (true) {
      const options: any = { limit: BATCH_SIZE };
      if (beforeSig) {
        options.before = beforeSig;
      }

      const sigs = await connection.getSignaturesForAddress(agentKey, options);

      if (sigs.length === 0) break;

      batchCount++;
      console.log(`  Batch ${batchCount}: ${sigs.length} signatures`);

      // Process this batch immediately
      for (const sigInfo of sigs) {
        try {
          const tx = await connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || !tx.meta) {
            totalProcessed++;
            continue;
          }

          const success = tx.meta.err === null;
          const timestamp = tx.blockTime || Math.floor(Date.now() / 1000);

          // Extract counterparty
          let counterparty: string | null = null;
          const accountKeys = tx.transaction.message.accountKeys;
          for (const key of accountKeys) {
            const pubkey = key.pubkey.toBase58();
            if (pubkey !== agentPubkey) {
              counterparty = pubkey;
              break;
            }
          }

          // Estimate volume
          let volume = 0;
          if (tx.meta.preBalances && tx.meta.postBalances) {
            const agentIdx = accountKeys.findIndex(
              (k) => k.pubkey.toBase58() === agentPubkey
            );
            if (agentIdx >= 0) {
              volume = Math.abs(
                tx.meta.postBalances[agentIdx] - tx.meta.preBalances[agentIdx]
              );
            }
          }

          // Upsert (skip duplicates)
          const result = await query(
            `INSERT INTO transactions (agent_pubkey, tx_hash, success, counterparty, volume, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tx_hash) DO NOTHING
             RETURNING id`,
            [agentPubkey, sigInfo.signature, success, counterparty, volume, timestamp]
          );

          if (result.rowCount && result.rowCount > 0) {
            totalInserted++;
          }

          totalProcessed++;

          if (totalProcessed % 100 === 0) {
            console.log(`  Processed ${totalProcessed} (${totalInserted} new)`);
          }
        } catch (err) {
          console.error(`  Error processing tx ${sigInfo.signature}:`, err);
          totalProcessed++;
        }

        // Small delay every 10 txs to avoid RPC rate limits
        if (totalProcessed % 10 === 0) {
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      // Move cursor to last signature in this batch
      beforeSig = sigs[sigs.length - 1].signature;

      // Delay between batches
      if (sigs.length === BATCH_SIZE) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      } else {
        break; // Last batch
      }
    }

    console.log(`✅ Backfill complete: ${totalProcessed} processed, ${totalInserted} new transactions`);

    // Recalculate score after all transactions stored
    if (totalInserted > 0) {
      console.log(`📊 Recalculating score for ${agentPubkey}...`);
      const result = await recalculateScore(agentPubkey);
      console.log(`   Score: ${result.score}, Tier: ${result.tier}`);
    }
  } catch (err) {
    console.error(`❌ Backfill failed for ${agentPubkey}:`, err);
    throw err;
  }
}
