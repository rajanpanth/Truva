/**
 * Database migration runner for Truva Protocol
 *
 * Tracks applied migrations in a _migrations table.
 * Safe to run multiple times — skips already-applied migrations.
 *
 * Usage:
 *   npm run db:migrate          — apply all pending migrations
 *   npm run db:migrate:status   — list applied migrations
 */

import fs from "fs";
import path from "path";
import { pool } from "./client";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

const ENSURE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT NOW()
);
`;

async function getAppliedMigrations(client: import("pg").PoolClient): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    "SELECT filename FROM _migrations ORDER BY id"
  );
  return new Set(result.rows.map((r) => r.filename));
}

function getMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure tracking table exists
    await client.query(ENSURE_MIGRATIONS_TABLE);

    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("✅ Database is up to date — no pending migrations");
      await client.query("COMMIT");
      return;
    }

    console.log(`🔄 Applying ${pending.length} migration(s)...`);

    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filepath, "utf8");

      console.log(`  ▶ ${filename}`);
      await client.query(sql);
      await client.query(
        "INSERT INTO _migrations (filename) VALUES ($1)",
        [filename]
      );
    }

    await client.query("COMMIT");
    console.log(`✅ Applied ${pending.length} migration(s) successfully`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getMigrationStatus(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(ENSURE_MIGRATIONS_TABLE);
    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    console.log("\nMigration status:");
    for (const f of files) {
      const status = applied.has(f) ? "✅ applied" : "⏳ pending";
      console.log(`  ${status}  ${f}`);
    }
    console.log();
  } finally {
    client.release();
  }
}

// CLI entry point
if (require.main === module) {
  const command = process.argv[2];
  const task = command === "status" ? getMigrationStatus() : runMigrations();
  task
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
