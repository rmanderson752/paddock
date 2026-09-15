// Database connection — libSQL via @libsql/client, which speaks both local
// SQLite files (`file:` URLs — dev, tests, scripts) and Turso (`libsql://`
// URLs — production on Vercel). Everything is async; use `db` (Drizzle) for
// typed queries and `client` for raw SQL, FTS5 and batches.

import { createClient, type Client, type InStatement } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function resolveUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const path = process.env.DATABASE_PATH ?? "data/paddock.db";
  return path.startsWith("file:") ? path : `file:${path}`;
}

const url = resolveUrl();
export const isLocalFile = url.startsWith("file:");

export const client: Client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Local files keep one connection, so these PRAGMAs stick. Turso manages its
// own journal and rejects connection-level pragmas over HTTP.
const ready: Promise<void> = isLocalFile
  ? client
      .executeMultiple("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")
      .then(() => undefined)
      .catch(() => undefined)
  : Promise.resolve();

/** Resolves once the connection-level setup has run (no-op for Turso). */
export function dbReady(): Promise<void> {
  return ready;
}

/** Run several write statements in one transaction / round trip. */
export async function batchWrite(statements: InStatement[]): Promise<void> {
  if (statements.length === 0) return;
  await ready;
  // Turso caps batch size; chunk generously below it
  const CHUNK = 500;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await client.batch(statements.slice(i, i + CHUNK), "write");
  }
}

// =============================================
// FTS5 full-text search index for generations
// =============================================

export async function ensureFtsIndex(): Promise<void> {
  await ready;
  // Drop the old contentless table if it exists (migration from an early schema)
  try {
    const info = await client.execute("SELECT sql FROM sqlite_master WHERE name = 'generations_fts'");
    const sql = info.rows[0]?.sql;
    if (typeof sql === "string" && sql.includes("content=''")) {
      await client.execute("DROP TABLE IF EXISTS generations_fts");
    }
  } catch {
    /* ignore */
  }

  await client.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS generations_fts USING fts5(
      generation_id UNINDEXED,
      make_name,
      model_name,
      gen_name,
      chassis_code,
      category,
      tokenize='porter unicode61'
    )
  `);
}

export async function rebuildFtsIndex(): Promise<void> {
  await ensureFtsIndex();
  await client.batch(
    [
      "DELETE FROM generations_fts",
      `INSERT INTO generations_fts(generation_id, make_name, model_name, gen_name, chassis_code, category)
       SELECT g.id, mk.name, m.name, g.name, COALESCE(g.chassis_code, ''), g.category
       FROM generations g
       JOIN models m ON g.model_id = m.id
       JOIN makes mk ON m.make_id = mk.id`,
    ],
    "write"
  );
}

/** Ranked generation ids for a free-text query (prefix matching per term). */
export async function searchFts(query: string): Promise<string[]> {
  await ensureFtsIndex();
  const count = await client.execute("SELECT COUNT(*) AS cnt FROM generations_fts");
  if (Number(count.rows[0]?.cnt ?? 0) === 0) {
    await rebuildFtsIndex();
  }
  const ftsQuery = query
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, "")}"*`)
    .join(" ");
  if (!ftsQuery) return [];
  try {
    const rows = await client.execute({
      sql: "SELECT generation_id FROM generations_fts WHERE generations_fts MATCH ? ORDER BY rank LIMIT 50",
      args: [ftsQuery],
    });
    return rows.rows.map((r) => String(r.generation_id)).filter(Boolean);
  } catch {
    // Fallback if FTS query syntax fails
    return [];
  }
}
