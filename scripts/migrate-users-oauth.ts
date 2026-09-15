/**
 * Migration: allow Google sign-in.
 *
 * Makes users.password_hash nullable and adds google_id (unique) and
 * avatar_url. SQLite can't alter constraints in place, so the table is
 * rebuilt and the rows copied. Idempotent — exits early if already applied.
 *
 * Usage:
 *   npx tsx scripts/migrate-users-oauth.ts      # local file, or Turso when TURSO_DATABASE_URL is set
 */

import "./env";
import { client, dbReady, isLocalFile } from "../src/lib/db";

async function main() {
  await dbReady();
  const cols = (await client.execute("PRAGMA table_info(users)")).rows.map((r) => String(r.name));
  if (cols.includes("google_id")) {
    console.log("users table already supports Google sign-in — nothing to do");
    return;
  }

  // Connection-level pragmas only apply to the local file; Turso rejects them
  const statements = [
    ...(isLocalFile ? ["PRAGMA foreign_keys = OFF"] : []),
      `CREATE TABLE users_new (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT,
        google_id TEXT UNIQUE,
        avatar_url TEXT,
        currency TEXT NOT NULL DEFAULT 'USD',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `INSERT INTO users_new (id, email, name, password_hash, currency, created_at, updated_at)
       SELECT id, email, name, password_hash, currency, created_at, updated_at FROM users`,
      "DROP TABLE users",
      "ALTER TABLE users_new RENAME TO users",
    ...(isLocalFile ? ["PRAGMA foreign_keys = ON"] : []),
  ];
  await client.batch(statements, "write");

  const count = (await client.execute("SELECT COUNT(*) AS n FROM users")).rows[0]?.n;
  console.log(`Migrated users table (${count} users kept)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
