/**
 * Bring a Trailer Scraper
 *
 * Scrapes completed auction results from bringatrailer.com model pages.
 * BaT embeds JSON data with recent completed auctions on each model page.
 *
 * Usage:
 *   npx tsx scripts/scrape-bat.ts
 *   npx tsx scripts/scrape-bat.ts --dry-run     # Preview without saving
 *   npx tsx scripts/scrape-bat.ts --car "e30 m3" # Scrape specific car
 *
 * Rate limiting: 2.5 second delay between requests.
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import { refreshAllStats } from "../src/lib/stats";

// ─── Config ──────────────────────────────────────────────────────────
const DELAY_MS = 2500;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ─── Types ───────────────────────────────────────────────────────────
interface BaTEntry {
  active: boolean;
  current_bid: number;
  current_bid_formatted: string;
  excerpt: string;
  noreserve: boolean;
  sold_text: string;
  title: string;
  url: string;
  timestamp_end: number;
  year: number | null;
  id: number;
}

interface ScrapedSale {
  title: string;
  excerpt: string;
  salePrice: number; // cents
  saleDate: string; // YYYY-MM-DD
  sourceUrl: string;
  year: number | null;
  mileage: number | null;
  sold: boolean;
  noReserve: boolean;
  conditionNotes: string | null;
}

interface CarConfig {
  makeName: string;
  modelName: string;
  generationName: string; // must match generations.name in the DB
  batModelPageUrl: string; // e.g. "bmw/e30-m3"
  yearStart: number;
  yearEnd: number | null;
  /** Listing title/excerpt must match — for pages that mix several variants */
  mustMatch?: RegExp;
  /** Listing title/excerpt must NOT match */
  mustNotMatch?: RegExp;
}

// ─── Car configs mapped to BaT model page URLs ──────────────────────
// BaT model pages are broad (porsche/993 lists every 993), so configs that
// share a page carve it up by model year and title pattern.
const CAR_CONFIGS: CarConfig[] = [
  // JDM
  { makeName: "Nissan", modelName: "Skyline GT-R", generationName: "R34 GT-R", batModelPageUrl: "nissan/r34-skyline", yearStart: 1999, yearEnd: 2002, mustMatch: /GT-R/i },
  { makeName: "Nissan", modelName: "Skyline GT-R", generationName: "R33 GT-R", batModelPageUrl: "nissan/r33-skyline", yearStart: 1995, yearEnd: 1998, mustMatch: /GT-R/i },
  { makeName: "Toyota", modelName: "Supra", generationName: "MK4 Supra Turbo", batModelPageUrl: "toyota/supra-a80-1994-2002", yearStart: 1993, yearEnd: 2002, mustMatch: /turbo/i },
  { makeName: "Honda", modelName: "NSX", generationName: "NSX", batModelPageUrl: "acura/nsx", yearStart: 1991, yearEnd: 2005 },
  { makeName: "Mazda", modelName: "RX-7", generationName: "FD RX-7", batModelPageUrl: "mazda/rx-7-fd", yearStart: 1992, yearEnd: 2002 },
  { makeName: "Honda", modelName: "S2000", generationName: "S2000", batModelPageUrl: "honda/s2000", yearStart: 1999, yearEnd: 2009 },
  { makeName: "Mitsubishi", modelName: "Lancer Evolution", generationName: "Evo VI", batModelPageUrl: "mitsubishi/lancer-evolution", yearStart: 1999, yearEnd: 2001, mustMatch: /Evolution VI\b|Evo VI\b|Evo 6\b/i },
  // 22B not on BaT as a separate model page — too rare. See insert-researched-sales.ts.

  // Retro
  { makeName: "Porsche", modelName: "911", generationName: "964 Turbo 3.3", batModelPageUrl: "porsche/964-turbo", yearStart: 1991, yearEnd: 1992, mustNotMatch: /RUF/ },
  { makeName: "Porsche", modelName: "911", generationName: "964 Turbo 3.6", batModelPageUrl: "porsche/964-turbo", yearStart: 1993, yearEnd: 1994, mustNotMatch: /RUF/ },
  { makeName: "Porsche", modelName: "911", generationName: "964 Carrera", batModelPageUrl: "porsche/964", yearStart: 1989, yearEnd: 1994, mustMatch: /Carrera/i, mustNotMatch: /Turbo|RS\b|Singer|RUF/ },
  { makeName: "Porsche", modelName: "911", generationName: "993 Turbo", batModelPageUrl: "porsche/993-turbo", yearStart: 1995, yearEnd: 1998, mustNotMatch: /GT2|RUF/ },
  { makeName: "Porsche", modelName: "911", generationName: "993 GT2", batModelPageUrl: "porsche/993-gt2", yearStart: 1995, yearEnd: 1998, mustMatch: /GT2/ },
  { makeName: "Porsche", modelName: "911", generationName: "993 Carrera", batModelPageUrl: "porsche/993", yearStart: 1994, yearEnd: 1998, mustMatch: /Carrera/i, mustNotMatch: /Turbo|GT2|RS\b|RUF/ },
  { makeName: "Porsche", modelName: "911", generationName: "930 Turbo", batModelPageUrl: "porsche/930-turbo", yearStart: 1975, yearEnd: 1989 },

  // Supercars
  { makeName: "Ferrari", modelName: "F40", generationName: "F40", batModelPageUrl: "ferrari/f40", yearStart: 1987, yearEnd: 1992 },
  { makeName: "Ferrari", modelName: "F50", generationName: "F50", batModelPageUrl: "ferrari/f50", yearStart: 1995, yearEnd: 1997 },
  { makeName: "Ferrari", modelName: "360", generationName: "360 Modena / Spider", batModelPageUrl: "ferrari/360", yearStart: 1999, yearEnd: 2005, mustNotMatch: /Challenge Stradale/i },
  { makeName: "Ferrari", modelName: "360", generationName: "360 Challenge Stradale", batModelPageUrl: "ferrari/360", yearStart: 2003, yearEnd: 2004, mustMatch: /Challenge Stradale/i },
  { makeName: "Ferrari", modelName: "F355", generationName: "F355", batModelPageUrl: "ferrari/f355", yearStart: 1994, yearEnd: 1999, mustNotMatch: /Challenge/i },
  { makeName: "Lamborghini", modelName: "Countach", generationName: "Countach", batModelPageUrl: "lamborghini/countach", yearStart: 1974, yearEnd: 1990 },
  { makeName: "Lamborghini", modelName: "Diablo", generationName: "Diablo", batModelPageUrl: "lamborghini/diablo", yearStart: 1990, yearEnd: 2001 },
  { makeName: "McLaren", modelName: "F1", generationName: "F1", batModelPageUrl: "mclaren/ultimate-series", yearStart: 1992, yearEnd: 1998, mustMatch: /McLaren F1\b/ },
  { makeName: "Porsche", modelName: "Carrera GT", generationName: "Carrera GT", batModelPageUrl: "porsche/carrera-gt", yearStart: 2004, yearEnd: 2007 },
  { makeName: "Ford", modelName: "GT", generationName: "GT (2005–2006)", batModelPageUrl: "ford/gt", yearStart: 2005, yearEnd: 2006 },

  // Trucks & SUVs
  { makeName: "Toyota", modelName: "Land Cruiser", generationName: "FJ40 Land Cruiser", batModelPageUrl: "toyota/fj40", yearStart: 1958, yearEnd: 1984 },
  { makeName: "Ford", modelName: "Bronco", generationName: "Bronco (1st Gen)", batModelPageUrl: "ford/bronco", yearStart: 1966, yearEnd: 1977 },
  { makeName: "Chevrolet", modelName: "K5 Blazer", generationName: "K5 Blazer", batModelPageUrl: "chevrolet/k5-blazer-1973-1991", yearStart: 1969, yearEnd: 1991 },
  { makeName: "Land Rover", modelName: "Defender", generationName: "Defender 90", batModelPageUrl: "land-rover/defender-90", yearStart: 1983, yearEnd: 2016 },

  // Modern Collectibles
  { makeName: "BMW", modelName: "M3", generationName: "E30 M3", batModelPageUrl: "bmw/e30-m3", yearStart: 1986, yearEnd: 1991 },
  { makeName: "BMW", modelName: "M3", generationName: "E46 M3", batModelPageUrl: "bmw/e46-m3", yearStart: 2001, yearEnd: 2006 },
  { makeName: "Mercedes-Benz", modelName: "SLS AMG", generationName: "SLS AMG", batModelPageUrl: "mercedes-benz/sls-amg", yearStart: 2010, yearEnd: 2015 },
  { makeName: "Porsche", modelName: "911 GT3 RS", generationName: "997 GT3 RS", batModelPageUrl: "porsche/911-gt3", yearStart: 2007, yearEnd: 2012, mustMatch: /GT3 RS/, mustNotMatch: /Cup/ },
  { makeName: "Porsche", modelName: "911 GT3 RS", generationName: "992 GT3 RS", batModelPageUrl: "porsche/911-gt3", yearStart: 2023, yearEnd: null, mustMatch: /GT3 RS/ },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#038;/g, "&");
}

function extractYearFromTitle(title: string): number | null {
  const match = title.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}

function extractMileageFromTitle(title: string): number | null {
  const kMatch = title.match(/(\d+)k[\s-]mile/i);
  if (kMatch) return parseInt(kMatch[1], 10) * 1000;
  return null;
}

function extractMileageFromExcerpt(text: string): number | null {
  const kMatch = text.match(/(?:shows?|showing|with|~)\s*(\d+)k\s*miles/i);
  if (kMatch) return parseInt(kMatch[1], 10) * 1000;

  const fullMatch = text.match(/(?:shows?|showing|with|~)\s*([0-9,]+)\s*miles/i);
  if (fullMatch) {
    const miles = parseInt(fullMatch[1].replace(/,/g, ""), 10);
    if (miles < 500000) return miles;
  }

  return null;
}

function isActualCar(title: string): boolean {
  const t = title.toLowerCase();
  const partsKeywords = [
    "wheel", "seat", "manual", "steering", "engine", "gearbox",
    "transmission", "exhaust", "bumper", "fender", "hood", "door",
    "mirror", "light", "lamp", "carpet", "floor mat", "tool kit",
    "luggage", "book", "brochure", "poster", "sign", "scale model",
    "diecast", "hot wheels", "literature", "memorabilia", "collection of",
    "set of", "pair of", "bench", "hardtop", "workshop",
    "parts", "windshield", "intake", "plenum", "manifold",
    "muffler", "caliper", "brake", "suspension", "spring",
    "shock", "strut", "radiator", "alternator", "starter",
    "children", "ride", "pedal car", "go-kart", "go kart",
    "toy", "model car", "badge", "emblem", "keychain",
  ];
  if (/^\d{4}\s/.test(title) || /^\w+-\w+\s+\d{4}\s/.test(title)) {
    return true;
  }
  return !partsKeywords.some((kw) => t.includes(kw));
}

function parseSoldText(soldText: string): { sold: boolean; price: number | null; date: string | null } {
  const sold = soldText.toLowerCase().includes("sold for");

  const priceMatch = soldText.match(/\$([0-9,]+)/);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) * 100 : null;

  const dateMatch = soldText.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  let date: string | null = null;
  if (dateMatch) {
    const month = dateMatch[1].padStart(2, "0");
    const day = dateMatch[2].padStart(2, "0");
    const yearShort = parseInt(dateMatch[3], 10);
    const year = dateMatch[3].length === 4 ? yearShort : (yearShort >= 50 ? 1900 + yearShort : 2000 + yearShort);
    date = `${year}-${month}-${day}`;
  }

  return { sold, price, date };
}

// ─── Fetcher ─────────────────────────────────────────────────────────
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (response.status === 429) {
      console.log("  Rate limited. Waiting 30s...");
      await sleep(30000);
      return fetchPage(url);
    }

    if (response.status === 404) {
      console.log(`  404 — page not found`);
      return null;
    }

    if (!response.ok) {
      console.log(`  HTTP ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (err) {
    console.log(`  Fetch error: ${err}`);
    return null;
  }
}

// ─── Main scrape logic ───────────────────────────────────────────────
async function scrapeBaTModelPage(config: CarConfig): Promise<ScrapedSale[]> {
  const url = `https://bringatrailer.com/${config.batModelPageUrl}/`;
  console.log(`  Fetching: ${url}`);

  const html = await fetchPage(url);
  if (!html) return [];

  // Extract embedded JSON auction data
  const jsonMatch = html.match(/\[\{"active":(?:true|false)[\s\S]*?\}\]/);
  if (!jsonMatch) {
    console.log("  No embedded auction data found");
    return [];
  }

  let entries: BaTEntry[];
  try {
    entries = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log(`  Failed to parse JSON: ${e}`);
    return [];
  }

  console.log(`  Found ${entries.length} embedded entries`);

  const sales: ScrapedSale[] = [];

  for (const entry of entries) {
    if (entry.active) continue;

    const title = decodeHtmlEntities(entry.title);

    if (!isActualCar(title)) continue;

    const { sold, price, date } = parseSoldText(entry.sold_text);
    if (!price || !date) continue;

    // Skip very low prices (likely parts that slipped through)
    if (price < 500000) continue; // Under $5,000

    const year = extractYearFromTitle(title);
    const excerpt = decodeHtmlEntities(entry.excerpt || "");
    const mileage = extractMileageFromTitle(title) || extractMileageFromExcerpt(excerpt);

    let conditionNotes: string | null = null;
    if (excerpt.length > 20) {
      const firstSentence = excerpt.match(/^[^.]+\./);
      if (firstSentence) conditionNotes = firstSentence[0].substring(0, 200);
    }

    sales.push({
      title,
      excerpt,
      salePrice: price,
      saleDate: date,
      sourceUrl: entry.url,
      year,
      mileage,
      sold,
      noReserve: entry.noreserve,
      conditionNotes,
    });
  }

  return sales;
}

// ─── Database ────────────────────────────────────────────────────────
function getDb() {
  const dbPath = path.resolve("data/paddock.db");
  if (!fs.existsSync(dbPath)) {
    console.error("Database not found at data/paddock.db. Run seed.ts first.");
    process.exit(1);
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

function resolveGenerationIds(db: Database.Database): Map<string, string> {
  // Map our config generationName → actual DB UUID
  const rows = db.prepare("SELECT id, name FROM generations").all() as { id: string; name: string }[];
  const nameToId = new Map<string, string>();
  for (const row of rows) {
    nameToId.set(row.name, row.id);
  }
  return nameToId;
}

function saveSales(db: Database.Database, generationId: string, sales: ScrapedSale[]) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO sales (id, generation_id, sale_price, sale_date, source, source_url, year, mileage, color, condition_notes, is_no_reserve, sold, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'bat', ?, ?, ?, NULL, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const existingUrls = new Set(
    (
      db
        .prepare("SELECT source_url FROM sales WHERE generation_id = ? AND source = 'bat'")
        .all(generationId) as { source_url: string | null }[]
    )
      .map((r) => r.source_url)
      .filter(Boolean)
  );

  let inserted = 0;
  for (const sale of sales) {
    if (sale.sourceUrl && existingUrls.has(sale.sourceUrl)) continue;

    const id = crypto.randomUUID();
    insert.run(
      id,
      generationId,
      sale.salePrice,
      sale.saleDate,
      sale.sourceUrl,
      sale.year,
      sale.mileage,
      sale.conditionNotes,
      sale.noReserve ? 1 : 0,
      sale.sold ? 1 : 0
    );
    inserted++;
  }

  return inserted;
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const carFilter = args.find((a, i) => args[i - 1] === "--car");

  console.log("Paddock — BaT Scraper");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE (writing to DB)"}`);
  console.log(`Rate limit: ${DELAY_MS}ms between requests\n`);

  const db = dryRun ? null : getDb();

  // Resolve generation names → DB UUIDs
  let genNameToId: Map<string, string> | null = null;
  if (db) {
    genNameToId = resolveGenerationIds(db);
    console.log(`Resolved ${genNameToId.size} generations from DB\n`);
  }

  let configs = CAR_CONFIGS;
  if (carFilter) {
    const filter = carFilter.toLowerCase();
    configs = configs.filter(
      (c) =>
        c.makeName.toLowerCase().includes(filter) ||
        c.modelName.toLowerCase().includes(filter) ||
        c.generationName.toLowerCase().includes(filter)
    );
    if (configs.length === 0) {
      console.error(`No cars matching "${carFilter}"`);
      process.exit(1);
    }
  }

  let totalScraped = 0;
  let totalInserted = 0;
  const scrapedPages = new Map<string, ScrapedSale[]>();

  for (const config of configs) {
    console.log(`\n--- ${config.makeName} ${config.generationName} ---`);

    let allSales: ScrapedSale[];
    if (scrapedPages.has(config.batModelPageUrl)) {
      allSales = scrapedPages.get(config.batModelPageUrl)!;
      console.log(`  Using cached results (${allSales.length} sales)`);
    } else {
      allSales = await scrapeBaTModelPage(config);
      scrapedPages.set(config.batModelPageUrl, allSales);
      await sleep(DELAY_MS);
    }

    const filtered = allSales.filter((s) => {
      // Vehicle listings always carry a model year; anything without one is
      // parts, memorabilia or a display model.
      if (!s.year) return false;
      if (s.year < config.yearStart) return false;
      if (config.yearEnd && s.year > config.yearEnd) return false;
      const text = `${s.title} ${s.excerpt}`;
      if (config.mustMatch && !config.mustMatch.test(text)) return false;
      if (config.mustNotMatch && config.mustNotMatch.test(text)) return false;
      return true;
    });

    console.log(`  Matched: ${filtered.length} sales (of ${allSales.length} total)`);
    totalScraped += filtered.length;

    if (dryRun) {
      for (const sale of filtered) {
        const priceStr = `$${(sale.salePrice / 100).toLocaleString()}`;
        const status = sale.sold ? "SOLD" : "BID";
        const miles = sale.mileage ? `${Math.round(sale.mileage / 1000)}k mi` : "? mi";
        console.log(`    ${sale.year || "?"} | ${priceStr.padEnd(12)} | ${sale.saleDate} | ${status} | ${miles} | ${sale.title.substring(0, 50)}`);
      }
    } else if (db && genNameToId) {
      const dbGenId = genNameToId.get(config.generationName);
      if (!dbGenId) {
        console.log(`  SKIP — generation "${config.generationName}" not found in DB`);
        continue;
      }
      const inserted = saveSales(db, dbGenId, filtered);
      totalInserted += inserted;
      console.log(`  Inserted: ${inserted} new records`);
    }
  }

  console.log("\n========================================");
  console.log(`Total scraped: ${totalScraped}`);
  if (!dryRun) console.log(`Total inserted: ${totalInserted}`);

  if (db) {
    db.close();
    const summary = refreshAllStats();
    console.log(
      `Stats refreshed as of ${summary.asOf}: ${summary.generationsUpdated} generations, ${summary.categories} categories`
    );
  }
  console.log("Done!");
}

main().catch(console.error);
