/**
 * Seed script — creates the schema and reference data (makes, models,
 * generations, empty category indices). Does NOT create sales — run
 * `npm run db:refresh` (or db:scrape) afterwards for real auction data.
 *
 * Works against the local SQLite file (default) or Turso when
 * TURSO_DATABASE_URL is set. It DROPS every table first; a remote database
 * requires --force so it can't be wiped by accident.
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:seed -- --force     # required for a remote (Turso) database
 */

import * as fs from "fs";
import * as path from "path";
import { client, isLocalFile, dbReady } from "../src/lib/db";
import type { InStatement } from "@libsql/client";

const force = process.argv.includes("--force");
if (!isLocalFile && !force) {
  console.error("Refusing to reseed a remote database without --force (this drops every table).");
  process.exit(1);
}

if (isLocalFile) {
  const dataDir = path.resolve("data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

const uuid = () => crypto.randomUUID();

const TABLES = [
  "generations_fts", "refresh_runs", "price_alerts", "portfolio_items", "watchlist_items",
  "users", "category_indices", "generation_stats", "sales", "generations", "models", "makes",
];

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS makes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    make_id TEXT NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS models_make_slug ON models(make_id, slug);

  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    year_start INTEGER NOT NULL,
    year_end INTEGER,
    chassis_code TEXT,
    category TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS gen_model_slug ON generations(model_id, slug);
  CREATE INDEX IF NOT EXISTS idx_gen_category ON generations(category);
  CREATE INDEX IF NOT EXISTS idx_gen_slug ON generations(slug);

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
    sale_price INTEGER NOT NULL,
    sale_date TEXT NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT,
    year INTEGER,
    mileage INTEGER,
    color TEXT,
    condition_notes TEXT,
    is_no_reserve INTEGER DEFAULT 0,
    sold INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sales_gen_date ON sales(generation_id, sale_date);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);

  CREATE TABLE IF NOT EXISTS generation_stats (
    id TEXT PRIMARY KEY,
    generation_id TEXT NOT NULL UNIQUE REFERENCES generations(id) ON DELETE CASCADE,
    last_sale_price INTEGER,
    last_sale_date TEXT,
    last_sale_source TEXT,
    avg_price_12mo INTEGER,
    high_52wk INTEGER,
    low_52wk INTEGER,
    sales_count_12mo INTEGER,
    trend_direction TEXT,
    trend_percentage REAL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS category_indices (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    index_value REAL,
    change_quarterly REAL,
    model_count INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watchlist_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS wl_user_gen ON watchlist_items(user_id, generation_id);
  CREATE INDEX IF NOT EXISTS idx_wl_user ON watchlist_items(user_id);

  CREATE TABLE IF NOT EXISTS portfolio_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id TEXT NOT NULL,
    purchase_price INTEGER NOT NULL,
    purchase_date TEXT,
    year INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_port_user ON portfolio_items(user_id);

  CREATE TABLE IF NOT EXISTS price_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    threshold_price INTEGER,
    is_active INTEGER DEFAULT 1,
    last_triggered_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id, is_active);

  CREATE TABLE IF NOT EXISTS refresh_runs (
    id TEXT PRIMARY KEY,
    trigger TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    sales_inserted INTEGER,
    pages_fetched INTEGER,
    message TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_runs_started ON refresh_runs(started_at);

  CREATE TABLE IF NOT EXISTS refresh_runs (
    id TEXT PRIMARY KEY,
    trigger TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    sales_inserted INTEGER,
    pages_fetched INTEGER,
    message TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_runs_started ON refresh_runs(started_at);
`;

// =============================================
// Reference data
// =============================================

const makesData = [
  { id: uuid(), name: "Nissan", slug: "nissan" },
  { id: uuid(), name: "Toyota", slug: "toyota" },
  { id: uuid(), name: "Honda", slug: "honda" },
  { id: uuid(), name: "Mazda", slug: "mazda" },
  { id: uuid(), name: "Mitsubishi", slug: "mitsubishi" },
  { id: uuid(), name: "Subaru", slug: "subaru" },
  { id: uuid(), name: "Porsche", slug: "porsche" },
  { id: uuid(), name: "Ferrari", slug: "ferrari" },
  { id: uuid(), name: "Lamborghini", slug: "lamborghini" },
  { id: uuid(), name: "McLaren", slug: "mclaren" },
  { id: uuid(), name: "BMW", slug: "bmw" },
  { id: uuid(), name: "Ford", slug: "ford" },
  { id: uuid(), name: "Land Rover", slug: "land-rover" },
  { id: uuid(), name: "Chevrolet", slug: "chevrolet" },
  { id: uuid(), name: "Mercedes-Benz", slug: "mercedes-benz" },
];

const makeLookup = Object.fromEntries(makesData.map((m) => [m.slug, m.id]));

const modelsData = [
  { id: uuid(), makeSlug: "nissan", name: "Skyline GT-R", slug: "skyline-gt-r" },
  { id: uuid(), makeSlug: "toyota", name: "Supra", slug: "supra" },
  { id: uuid(), makeSlug: "honda", name: "NSX", slug: "nsx" },
  { id: uuid(), makeSlug: "mazda", name: "RX-7", slug: "rx-7" },
  { id: uuid(), makeSlug: "honda", name: "S2000", slug: "s2000" },
  { id: uuid(), makeSlug: "mitsubishi", name: "Lancer Evolution", slug: "lancer-evolution" },
  { id: uuid(), makeSlug: "subaru", name: "Impreza WRX STI", slug: "impreza-wrx-sti" },
  { id: uuid(), makeSlug: "porsche", name: "911", slug: "911" },
  { id: uuid(), makeSlug: "ferrari", name: "F40", slug: "f40" },
  { id: uuid(), makeSlug: "ferrari", name: "F355", slug: "f355" },
  { id: uuid(), makeSlug: "lamborghini", name: "Countach", slug: "countach" },
  { id: uuid(), makeSlug: "mclaren", name: "F1", slug: "f1" },
  { id: uuid(), makeSlug: "porsche", name: "Carrera GT", slug: "carrera-gt" },
  { id: uuid(), makeSlug: "ford", name: "Bronco", slug: "bronco" },
  { id: uuid(), makeSlug: "toyota", name: "Land Cruiser", slug: "land-cruiser" },
  { id: uuid(), makeSlug: "chevrolet", name: "K5 Blazer", slug: "k5-blazer" },
  { id: uuid(), makeSlug: "land-rover", name: "Defender", slug: "defender" },
  { id: uuid(), makeSlug: "bmw", name: "M3", slug: "m3" },
  { id: uuid(), makeSlug: "ferrari", name: "F50", slug: "f50" },
  { id: uuid(), makeSlug: "ferrari", name: "360", slug: "360" },
  { id: uuid(), makeSlug: "lamborghini", name: "Diablo", slug: "diablo" },
  { id: uuid(), makeSlug: "ford", name: "GT", slug: "gt" },
  { id: uuid(), makeSlug: "porsche", name: "911 GT3 RS", slug: "911-gt3-rs" },
  { id: uuid(), makeSlug: "mercedes-benz", name: "SLS AMG", slug: "sls-amg" },
];

const modelLookup = Object.fromEntries(modelsData.map((m) => [m.slug, m.id]));

// Generations — all 34
interface GenSeed {
  modelSlug: string;
  name: string;
  slug: string;
  yearStart: number;
  yearEnd: number | null;
  chassisCode: string | null;
  category: string;
  description: string;
}

const genSeeds: GenSeed[] = [
  // JDM (8)
  { modelSlug: "skyline-gt-r", name: "R34 GT-R", slug: "r34-gt-r", yearStart: 1999, yearEnd: 2002, chassisCode: "BNR34", category: "jdm", description: "The holy grail of JDM. Twin-turbo RB26DETT, ATTESA E-TS Pro AWD. V-Spec, V-Spec II, M-Spec and Nür editions." },
  { modelSlug: "skyline-gt-r", name: "R33 GT-R", slug: "r33-gt-r", yearStart: 1995, yearEnd: 1998, chassisCode: "BCNR33", category: "jdm", description: "The underrated middle child. Le Mans pedigree." },
  { modelSlug: "supra", name: "MK4 Supra Turbo", slug: "mk4-supra-turbo", yearStart: 1993, yearEnd: 2002, chassisCode: "JZA80", category: "jdm", description: "2JZ-GTE twin-turbo legend. 6-speed Getrag." },
  { modelSlug: "nsx", name: "NSX", slug: "nsx", yearStart: 1991, yearEnd: 2005, chassisCode: "NA1 / NA2", category: "jdm", description: "The everyday supercar. Hand-built in Tochigi; 3.0L C30A, later 3.2L C32B VTEC. The car that scared Ferrari." },
  { modelSlug: "rx-7", name: "FD RX-7", slug: "fd-rx-7", yearStart: 1992, yearEnd: 2002, chassisCode: "FD3S", category: "jdm", description: "Sequential twin-turbo 13B rotary. Final evolution." },
  { modelSlug: "s2000", name: "S2000", slug: "s2000", yearStart: 1999, yearEnd: 2009, chassisCode: "AP1 / AP2", category: "jdm", description: "9,000 RPM F20C (AP1) and torquier F22C (AP2). The driver's roadster." },
  { modelSlug: "lancer-evolution", name: "Evo VI", slug: "evo-vi", yearStart: 1999, yearEnd: 2001, chassisCode: "CP9A", category: "jdm", description: "Rally-bred, street-legal weapon. Includes the Tommi Mäkinen Edition." },
  { modelSlug: "impreza-wrx-sti", name: "22B STI", slug: "22b-sti", yearStart: 1998, yearEnd: 1998, chassisCode: "GC8", category: "jdm", description: "Only 424 made. WRC homologation special. 2.2L flat-four." },

  // Air-cooled Porsche (7)
  { modelSlug: "911", name: "964 Turbo 3.6", slug: "964-turbo-3-6", yearStart: 1993, yearEnd: 1994, chassisCode: "964", category: "retro", description: "The final air-cooled single-turbo 911. 360hp flat-six." },
  { modelSlug: "911", name: "964 Turbo 3.3", slug: "964-turbo-3-3", yearStart: 1991, yearEnd: 1992, chassisCode: "964", category: "retro", description: "Classic single-turbo 930 motor in the 964 body." },
  { modelSlug: "911", name: "964 Carrera", slug: "964-carrera", yearStart: 1989, yearEnd: 1994, chassisCode: "964", category: "retro", description: "Carrera 2 and Carrera 4 — coupe, Targa and cabriolet. The first modern air-cooled 911." },
  { modelSlug: "911", name: "993 Turbo", slug: "993-turbo", yearStart: 1995, yearEnd: 1998, chassisCode: "993", category: "retro", description: "Last air-cooled 911 Turbo. Twin-turbo, AWD, 408hp." },
  { modelSlug: "911", name: "993 GT2", slug: "993-gt2", yearStart: 1995, yearEnd: 1998, chassisCode: "993", category: "retro", description: "RWD, twin-turbo, widebody. Homologation race car for the street." },
  { modelSlug: "911", name: "993 Carrera", slug: "993-carrera", yearStart: 1994, yearEnd: 1998, chassisCode: "993", category: "retro", description: "Carrera, Carrera S and 4S. The last air-cooled 911 and, to many, the best-looking." },
  { modelSlug: "911", name: "930 Turbo", slug: "930-turbo", yearStart: 1975, yearEnd: 1989, chassisCode: "930", category: "retro", description: "The original widowmaker. Turbo lag and snap oversteer." },

  // Supercars (10)
  { modelSlug: "f40", name: "F40", slug: "f40", yearStart: 1987, yearEnd: 1992, chassisCode: null, category: "supercar", description: "Enzo's last commission. Twin-turbo V8, kevlar body." },
  { modelSlug: "f50", name: "F50", slug: "f50", yearStart: 1995, yearEnd: 1997, chassisCode: null, category: "supercar", description: "F1-derived V12. Carbon tub. 349 built. The analog hypercar." },
  { modelSlug: "360", name: "360 Modena / Spider", slug: "360-modena", yearStart: 1999, yearEnd: 2005, chassisCode: null, category: "supercar", description: "The first aluminium-chassis Ferrari. 3.6L V8, gated six-speed or F1 paddles. The attainable modern Ferrari." },
  { modelSlug: "360", name: "360 Challenge Stradale", slug: "360-challenge-stradale", yearStart: 2003, yearEnd: 2004, chassisCode: null, category: "supercar", description: "Stripped-out 360. Lighter, louder, faster. The purist's Ferrari." },
  { modelSlug: "f355", name: "F355", slug: "f355", yearStart: 1994, yearEnd: 1999, chassisCode: null, category: "supercar", description: "The prettiest modern Ferrari. 3.5L five-valve V8 — Berlinetta, GTS and Spider." },
  { modelSlug: "countach", name: "Countach", slug: "countach", yearStart: 1974, yearEnd: 1990, chassisCode: null, category: "supercar", description: "The poster car. From the Periscopio LP400 to the 5000 QV and 25th Anniversary. Pure Gandini." },
  { modelSlug: "diablo", name: "Diablo", slug: "diablo", yearStart: 1990, yearEnd: 2001, chassisCode: null, category: "supercar", description: "The last analog Lambo. 5.7L then 6.0L V12 — Diablo, VT, SE30, SV and GT." },
  { modelSlug: "f1", name: "F1", slug: "f1", yearStart: 1992, yearEnd: 1998, chassisCode: null, category: "supercar", description: "BMW S70 V12. Center-seat driving position. Gold-lined engine bay." },
  { modelSlug: "carrera-gt", name: "Carrera GT", slug: "carrera-gt", yearStart: 2004, yearEnd: 2007, chassisCode: null, category: "supercar", description: "V10 derived from F1 program. Manual gearbox. 1,270 built." },
  { modelSlug: "gt", name: "GT (2005–2006)", slug: "gt-2005", yearStart: 2005, yearEnd: 2006, chassisCode: null, category: "supercar", description: "Supercharged 5.4L V8. Le Mans tribute. 4,038 built." },

  // Trucks & SUVs (4)
  { modelSlug: "land-cruiser", name: "FJ40 Land Cruiser", slug: "fj40-land-cruiser", yearStart: 1958, yearEnd: 1984, chassisCode: "FJ40", category: "truck_suv", description: "The original overlander. Bulletproof F-series engine." },
  { modelSlug: "bronco", name: "Bronco (1st Gen)", slug: "bronco-1st-gen", yearStart: 1966, yearEnd: 1977, chassisCode: null, category: "truck_suv", description: "Ford's original sport utility. V8, removable top." },
  { modelSlug: "k5-blazer", name: "K5 Blazer", slug: "k5-blazer", yearStart: 1969, yearEnd: 1991, chassisCode: null, category: "truck_suv", description: "Full-size, removable top. The suburban cowboy's ride." },
  { modelSlug: "defender", name: "Defender 90", slug: "defender-90", yearStart: 1983, yearEnd: 2016, chassisCode: null, category: "truck_suv", description: "Go-anywhere icon. Agricultural luxury." },

  // Modern Collectible (5)
  { modelSlug: "m3", name: "E30 M3", slug: "e30-m3", yearStart: 1986, yearEnd: 1991, chassisCode: "E30", category: "modern_collectible", description: "S14 four-cylinder. DTM homologation. The original M3." },
  { modelSlug: "m3", name: "E46 M3", slug: "e46-m3", yearStart: 2001, yearEnd: 2006, chassisCode: "E46", category: "modern_collectible", description: "S54 inline-six. The gateway drug. Manual 6-speed coupe is the one." },
  { modelSlug: "sls-amg", name: "SLS AMG", slug: "sls-amg", yearStart: 2010, yearEnd: 2015, chassisCode: "C197 / R197", category: "modern_collectible", description: "6.2L M159 V8, gullwing doors. Coupe, Roadster and GT — hand-built AMG." },
  { modelSlug: "911-gt3-rs", name: "997 GT3 RS", slug: "997-gt3-rs", yearStart: 2007, yearEnd: 2012, chassisCode: "997", category: "modern_collectible", description: "Mezger flat-six, 3.6L to 4.0L. The last hydraulic-steering GT3 RS." },
  { modelSlug: "911-gt3-rs", name: "992 GT3 RS", slug: "992-gt3-rs", yearStart: 2023, yearEnd: null, chassisCode: "992", category: "modern_collectible", description: "Active aero. 518hp 4.0L flat-six. DRS wing." },
];


// Category indices — created empty here and computed from real sales by
// `npm run db:stats` (also run automatically by the refresh job).
const indices = [
  { category: "jdm", displayName: "JDM Icons" },
  { category: "supercar", displayName: "Supercars" },
  { category: "retro", displayName: "Air-Cooled Porsche" },
  { category: "truck_suv", displayName: "Trucks & SUVs" },
  { category: "modern_collectible", displayName: "Modern Collectibles" },
];


async function main() {
  await dbReady();

  // Drop everything, in dependency order
  for (const table of TABLES) {
    await client.execute(`DROP TABLE IF EXISTS ${table}`);
  }
  console.log("Dropped existing tables");

  await client.executeMultiple(SCHEMA_SQL);
  console.log("Tables created");

  const statements: InStatement[] = [];
  for (const make of makesData) {
    statements.push({ sql: "INSERT INTO makes (id, name, slug) VALUES (?, ?, ?)", args: [make.id, make.name, make.slug] });
  }
  for (const model of modelsData) {
    statements.push({
      sql: "INSERT INTO models (id, make_id, name, slug) VALUES (?, ?, ?, ?)",
      args: [model.id, makeLookup[model.makeSlug], model.name, model.slug],
    });
  }
  let genCount = 0;
  for (const gen of genSeeds) {
    const modelId = modelLookup[gen.modelSlug];
    if (!modelId) {
      console.error(`Model not found for slug: ${gen.modelSlug}`);
      continue;
    }
    statements.push({
      sql: "INSERT INTO generations (id, model_id, name, slug, year_start, year_end, chassis_code, category, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [uuid(), modelId, gen.name, gen.slug, gen.yearStart, gen.yearEnd, gen.chassisCode, gen.category, gen.description],
    });
    genCount++;
  }
  for (const idx of indices) {
    statements.push({
      sql: "INSERT INTO category_indices (id, category, display_name, index_value, change_quarterly, model_count) VALUES (?, ?, ?, 0, 0, 0)",
      args: [uuid(), idx.category, idx.displayName],
    });
  }
  await client.batch(statements, "write");

  console.log(`Inserted ${makesData.length} makes, ${modelsData.length} models, ${genCount} generations, ${indices.length} category indices`);
  console.log(`\nSeed complete (${isLocalFile ? "local file" : "remote database"}).`);
  console.log("Next: run 'npm run db:refresh' to pull real auction data and compute stats.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
