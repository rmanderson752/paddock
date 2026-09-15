/**
 * Data cleanup — fixes the sales data imported by the first scraper runs.
 *
 * The BaT scraper pulls whole model pages (e.g. porsche/993), so several
 * generations that were seeded as rare variants ended up holding sales for the
 * ordinary model. This script:
 *   1. removes non-vehicle listings (parts, memorabilia, display models),
 *   2. removes listings that are a different model than the generation,
 *   3. moves sales to the correct generation where the split is by year/variant,
 *   4. renames generations to match the data they actually hold,
 *   5. removes duplicate records,
 *   6. recomputes generation stats and category indices.
 *
 * Idempotent — safe to run more than once.
 *
 * Usage:
 *   npx tsx scripts/clean-data.ts
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { refreshAllStats } from "../src/lib/stats";
import { rebuildFtsIndex } from "../src/lib/db";

const dbPath = path.resolve("data/paddock.db");
if (!fs.existsSync(dbPath)) {
  console.error("Database not found at data/paddock.db. Run `npm run db:seed` first.");
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const uuid = () => crypto.randomUUID();

function genId(name: string): string | null {
  const row = db.prepare("SELECT id FROM generations WHERE name = ?").get(name) as { id: string } | undefined;
  return row?.id ?? null;
}

function modelId(makeSlug: string, modelSlug: string): string | null {
  const row = db
    .prepare(
      `SELECT m.id FROM models m JOIN makes mk ON mk.id = m.make_id WHERE mk.slug = ? AND m.slug = ?`
    )
    .get(makeSlug, modelSlug) as { id: string } | undefined;
  return row?.id ?? null;
}

function deleteSales(genName: string, where: string, params: unknown[] = []): void {
  const id = genId(genName);
  if (!id) return;
  const res = db.prepare(`DELETE FROM sales WHERE generation_id = ? AND (${where})`).run(id, ...params);
  if (res.changes) console.log(`  ${genName}: removed ${res.changes} (${where})`);
}

const run = db.transaction(() => {
  // 1. Non-vehicle listings — BaT vehicle listings always carry a model year.
  const parts = db.prepare("DELETE FROM sales WHERE source = 'bat' AND year IS NULL").run();
  console.log(`Removed ${parts.changes} non-vehicle BaT listings`);

  // 2. Listings that are a different model than the generation they were filed under.
  console.log("Removing mismatched listings:");
  deleteSales("R33 GT-R", "condition_notes NOT LIKE '%GT-R%'");
  deleteSales("R34 GT-R V-Spec", "condition_notes NOT LIKE '%GT-R%'");
  deleteSales("R34 GT-R", "condition_notes NOT LIKE '%GT-R%'");
  deleteSales("MK4 Supra Turbo", "condition_notes NOT LIKE '%Turbo%'");
  deleteSales("992 GT3 RS", "condition_notes NOT LIKE '%GT3 RS%'");
  deleteSales("997 GT3 RS 4.0", "condition_notes LIKE '%GT3 Cup%'");
  deleteSales("997 GT3 RS", "condition_notes LIKE '%GT3 Cup%'");
  deleteSales("993 GT2", "condition_notes NOT LIKE '%GT2%'");
  deleteSales("F355 Berlinetta", "condition_notes LIKE '%F355 Challenge%'");
  deleteSales("F355", "condition_notes LIKE '%F355 Challenge%'");
  deleteSales("964 Turbo 3.3", "condition_notes LIKE '%RUF%'");
  deleteSales("964 Turbo 3.6", "condition_notes LIKE '%RUF%'");

  // 3a. The 360 page mixes Modena/Spider with the Challenge Stradale — split them.
  const csId = genId("360 Challenge Stradale");
  if (csId) {
    let modenaId = genId("360 Modena / Spider");
    if (!modenaId) {
      const m = modelId("ferrari", "360");
      if (m) {
        modenaId = uuid();
        db.prepare(
          `INSERT INTO generations (id, model_id, name, slug, year_start, year_end, chassis_code, category, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          modenaId, m, "360 Modena / Spider", "360-modena", 1999, 2005, null, "supercar",
          "The first aluminium-chassis Ferrari. 3.6L V8, gated six-speed or F1 paddles. The attainable modern Ferrari."
        );
        console.log("  Created generation: 360 Modena / Spider");
      }
    }
    if (modenaId) {
      const moved = db
        .prepare(
          "UPDATE sales SET generation_id = ? WHERE generation_id = ? AND condition_notes NOT LIKE '%Challenge Stradale%'"
        )
        .run(modenaId, csId);
      if (moved.changes) console.log(`  Moved ${moved.changes} Modena/Spider sales out of the Challenge Stradale`);
    }
  }

  // 3b. Both 964 Turbo generations were scraped from the same page — split by model year.
  const t33 = genId("964 Turbo 3.3");
  const t36 = genId("964 Turbo 3.6");
  if (t33 && t36) {
    const a = db.prepare("UPDATE sales SET generation_id = ? WHERE generation_id = ? AND year <= 1992").run(t33, t36);
    const b = db.prepare("UPDATE sales SET generation_id = ? WHERE generation_id = ? AND year >= 1993").run(t36, t33);
    if (a.changes || b.changes) console.log(`  964 Turbo: re-filed ${a.changes} sales to 3.3 and ${b.changes} to 3.6 by model year`);
  }

  // 3c. The NSX Type R held a copy of the NA1 data — there is no Type R data yet.
  const typeR = genId("NSX Type R");
  if (typeR) {
    db.prepare("DELETE FROM sales WHERE generation_id = ?").run(typeR);
    db.prepare("DELETE FROM generation_stats WHERE generation_id = ?").run(typeR);
    db.prepare("DELETE FROM watchlist_items WHERE generation_id = ?").run(typeR);
    db.prepare("DELETE FROM portfolio_items WHERE generation_id = ?").run(typeR);
    db.prepare("DELETE FROM price_alerts WHERE generation_id = ?").run(typeR);
    db.prepare("DELETE FROM generations WHERE id = ?").run(typeR);
    console.log("  Removed NSX Type R (duplicate of NSX data)");
  }

  // 4. Rename generations to describe what the data actually covers.
  const renames: {
    from: string; to: string; slug: string; yearStart: number; yearEnd: number | null;
    chassis: string | null; description: string;
  }[] = [
    { from: "R34 GT-R V-Spec", to: "R34 GT-R", slug: "r34-gt-r", yearStart: 1999, yearEnd: 2002, chassis: "BNR34",
      description: "The holy grail of JDM. Twin-turbo RB26DETT, ATTESA E-TS Pro AWD. V-Spec, V-Spec II, M-Spec and Nür editions." },
    { from: "NSX (NA1)", to: "NSX", slug: "nsx", yearStart: 1991, yearEnd: 2005, chassis: "NA1 / NA2",
      description: "The everyday supercar. Hand-built in Tochigi; 3.0L C30A, later 3.2L C32B VTEC. The car that scared Ferrari." },
    { from: "S2000 AP1", to: "S2000", slug: "s2000", yearStart: 1999, yearEnd: 2009, chassis: "AP1 / AP2",
      description: "9,000 RPM F20C (AP1) and torquier F22C (AP2). The driver's roadster." },
    { from: "Evo VI TME", to: "Evo VI", slug: "evo-vi", yearStart: 1999, yearEnd: 2001, chassis: "CP9A",
      description: "Rally-bred, street-legal weapon. Includes the Tommi Mäkinen Edition." },
    { from: "FD RX-7", to: "FD RX-7", slug: "fd-rx-7", yearStart: 1992, yearEnd: 2002, chassis: "FD3S",
      description: "Sequential twin-turbo 13B rotary. Final evolution." },
    { from: "964 Carrera RS", to: "964 Carrera", slug: "964-carrera", yearStart: 1989, yearEnd: 1994, chassis: "964",
      description: "Carrera 2 and Carrera 4 — coupe, Targa and cabriolet. The first modern air-cooled 911." },
    { from: "993 Carrera RS", to: "993 Carrera", slug: "993-carrera", yearStart: 1994, yearEnd: 1998, chassis: "993",
      description: "Carrera, Carrera S and 4S. The last air-cooled 911 and, to many, the best-looking." },
    { from: "360 Challenge Stradale", to: "360 Challenge Stradale", slug: "360-challenge-stradale", yearStart: 2003, yearEnd: 2004, chassis: null,
      description: "Stripped-out 360. Lighter, louder, faster. The purist's Ferrari." },
    { from: "F355 Berlinetta", to: "F355", slug: "f355", yearStart: 1994, yearEnd: 1999, chassis: null,
      description: "The prettiest modern Ferrari. 3.5L five-valve V8 — Berlinetta, GTS and Spider." },
    { from: "Countach LP400", to: "Countach", slug: "countach", yearStart: 1974, yearEnd: 1990, chassis: null,
      description: "The poster car. From the Periscopio LP400 to the 5000 QV and 25th Anniversary. Pure Gandini." },
    { from: "Diablo SV", to: "Diablo", slug: "diablo", yearStart: 1990, yearEnd: 2001, chassis: null,
      description: "The last analog Lambo. 5.7L then 6.0L V12 — Diablo, VT, SE30, SV and GT." },
    { from: "Ford GT (2005)", to: "GT (2005–2006)", slug: "gt-2005", yearStart: 2005, yearEnd: 2006, chassis: null,
      description: "Supercharged 5.4L V8. Le Mans tribute. 4,038 built." },
    { from: "SLS AMG Black Series", to: "SLS AMG", slug: "sls-amg", yearStart: 2010, yearEnd: 2015, chassis: "C197 / R197",
      description: "6.2L M159 V8, gullwing doors. Coupe, Roadster and GT — hand-built AMG." },
    { from: "997 GT3 RS 4.0", to: "997 GT3 RS", slug: "997-gt3-rs", yearStart: 2007, yearEnd: 2012, chassis: "997",
      description: "Mezger flat-six, 3.6L to 4.0L. The last hydraulic-steering GT3 RS." },
  ];

  console.log("Renaming generations:");
  for (const r of renames) {
    const id = genId(r.from);
    if (!id) continue;
    db.prepare(
      `UPDATE generations SET name = ?, slug = ?, year_start = ?, year_end = ?, chassis_code = ?, description = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(r.to, r.slug, r.yearStart, r.yearEnd, r.chassis, r.description, id);
    if (r.from !== r.to) console.log(`  ${r.from} → ${r.to}`);
  }

  // 5. Duplicate records (same generation + source URL) — keep the earliest inserted.
  const dupes = db
    .prepare(
      `DELETE FROM sales WHERE id IN (
         SELECT s.id FROM sales s
         JOIN sales k ON k.generation_id = s.generation_id AND k.source_url = s.source_url
         WHERE s.source_url IS NOT NULL AND k.rowid < s.rowid
       )`
    )
    .run();
  console.log(`Removed ${dupes.changes} duplicate sales`);
});

run();
db.close();

// 6. Recompute everything derived from sales, and re-index the renamed cars for search.
const summary = refreshAllStats();
rebuildFtsIndex();
console.log(
  `\nStats refreshed as of ${summary.asOf}: ${summary.generationsUpdated} generations updated, ` +
  `${summary.generationsCleared} without sales, ${summary.categories} category indices. Search index rebuilt.`
);
