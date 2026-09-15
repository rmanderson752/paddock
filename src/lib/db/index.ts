import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(process.env.DATABASE_PATH ?? "data/paddock.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// FTS5 full-text search index for generations
export function ensureFtsIndex() {
  // Drop old contentless table if it exists (migration)
  try {
    const info = sqlite.prepare("SELECT sql FROM sqlite_master WHERE name = 'generations_fts'").get() as { sql: string } | undefined;
    if (info?.sql?.includes("content=''")) {
      sqlite.exec("DROP TABLE IF EXISTS generations_fts");
    }
  } catch { /* ignore */ }

  sqlite.exec(`
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

export function rebuildFtsIndex() {
  ensureFtsIndex();
  sqlite.exec(`DELETE FROM generations_fts`);
  sqlite.exec(`
    INSERT INTO generations_fts(generation_id, make_name, model_name, gen_name, chassis_code, category)
    SELECT g.id, mk.name, m.name, g.name, COALESCE(g.chassis_code, ''), g.category
    FROM generations g
    JOIN models m ON g.model_id = m.id
    JOIN makes mk ON m.make_id = mk.id
  `);
}

export function searchFts(query: string): string[] {
  ensureFtsIndex();
  // Check if index has content
  const count = sqlite.prepare("SELECT COUNT(*) as cnt FROM generations_fts").get() as { cnt: number };
  if (count.cnt === 0) {
    rebuildFtsIndex();
  }
  // FTS5 query: add * for prefix matching
  const ftsQuery = query.split(/\s+/).map(t => `"${t}"*`).join(" ");
  try {
    const rows = sqlite.prepare(
      "SELECT generation_id FROM generations_fts WHERE generations_fts MATCH ? ORDER BY rank LIMIT 50"
    ).all(ftsQuery) as { generation_id: string }[];
    return rows.map(r => r.generation_id).filter(Boolean);
  } catch {
    // Fallback if FTS query syntax fails
    return [];
  }
}

export { sqlite };
