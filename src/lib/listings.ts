// Server-only — the `sale_listings` store: the source text behind every sale.
//
// A sale arrives from the scraper with only a title and a one-line excerpt.
// `fetchMissingListings` then visits each Bring a Trailer listing page (rate
// limited, a bounded number per run) and replaces the excerpt with the full
// write-up and the "BaT Essentials" bullets. The extraction pipeline
// (lib/extraction) reads from here, never from the network.

import { client, batchWrite, ensureAuxTables } from "./db";
import { fetchBaTListing, listingContentHash, type ParsedListing } from "./scraper/bat-listing";
import type { InStatement } from "@libsql/client";

export type ListingTextSource = "listing_page" | "excerpt";

export interface SaleListing {
  saleId: string;
  title: string;
  essentials: string[];
  description: string;
  vin: string | null;
  lotNumber: string | null;
  sellerType: "private_party" | "dealer" | null;
  location: string | null;
  textSource: ListingTextSource;
  contentHash: string;
  fetchedAt: string;
}

/** The extraction tables are created on first use (see db/index.ts). */
export function ensureExtractionTables(): Promise<void> {
  return ensureAuxTables();
}

function listingStatement(saleId: string, listing: ParsedListing, textSource: ListingTextSource): InStatement {
  return {
    sql: `INSERT INTO sale_listings (sale_id, title, essentials, description, vin, lot_number, seller_type, location, text_source, content_hash, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sale_id) DO UPDATE SET
            title = excluded.title, essentials = excluded.essentials, description = excluded.description,
            vin = excluded.vin, lot_number = excluded.lot_number, seller_type = excluded.seller_type,
            location = excluded.location, text_source = excluded.text_source,
            content_hash = excluded.content_hash, fetched_at = excluded.fetched_at`,
    args: [
      saleId,
      listing.title,
      textSource === "listing_page" ? JSON.stringify(listing.essentials) : null,
      listing.description || null,
      listing.vin,
      listing.lotNumber,
      listing.sellerType,
      listing.location,
      textSource,
      listingContentHash(listing),
      new Date().toISOString(),
    ],
  };
}

/** Store the model-page excerpt for freshly scraped sales (the page comes later). */
export async function saveExcerptListings(rows: { saleId: string; title: string; excerpt: string }[]): Promise<void> {
  if (rows.length === 0) return;
  await ensureExtractionTables();
  await batchWrite(
    rows.map((r) =>
      listingStatement(
        r.saleId,
        { title: r.title, essentials: [], description: r.excerpt, vin: null, lotNumber: null, sellerType: null, location: null },
        "excerpt"
      )
    )
  );
}

export async function saveListingPage(saleId: string, listing: ParsedListing): Promise<void> {
  await ensureExtractionTables();
  await client.execute(listingStatement(saleId, listing, "listing_page"));
}

function rowToListing(r: Record<string, unknown>): SaleListing {
  let essentials: string[] = [];
  if (typeof r.essentials === "string") {
    try {
      const parsed = JSON.parse(r.essentials);
      if (Array.isArray(parsed)) essentials = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      essentials = [];
    }
  }
  return {
    saleId: String(r.sale_id),
    title: String(r.title),
    essentials,
    description: r.description === null || r.description === undefined ? "" : String(r.description),
    vin: r.vin === null || r.vin === undefined ? null : String(r.vin),
    lotNumber: r.lot_number === null || r.lot_number === undefined ? null : String(r.lot_number),
    sellerType: (r.seller_type as SaleListing["sellerType"]) ?? null,
    location: r.location === null || r.location === undefined ? null : String(r.location),
    textSource: r.text_source as ListingTextSource,
    contentHash: String(r.content_hash),
    fetchedAt: String(r.fetched_at),
  };
}

export async function getListingsForSales(saleIds: string[]): Promise<Map<string, SaleListing>> {
  const out = new Map<string, SaleListing>();
  if (saleIds.length === 0) return out;
  await ensureExtractionTables();
  const CHUNK = 200;
  for (let i = 0; i < saleIds.length; i += CHUNK) {
    const ids = saleIds.slice(i, i + CHUNK);
    const res = await client.execute({
      sql: `SELECT * FROM sale_listings WHERE sale_id IN (${ids.map(() => "?").join(",")})`,
      args: ids,
    });
    for (const r of res.rows) out.set(String(r.sale_id), rowToListing(r as Record<string, unknown>));
  }
  return out;
}

export async function getListingBySourceUrl(sourceUrl: string): Promise<SaleListing | null> {
  await ensureExtractionTables();
  const res = await client.execute({
    sql: `SELECT l.* FROM sale_listings l JOIN sales s ON s.id = l.sale_id WHERE s.source_url = ? LIMIT 1`,
    args: [sourceUrl],
  });
  const row = res.rows[0];
  return row ? rowToListing(row as Record<string, unknown>) : null;
}

export interface FetchListingsOptions {
  /** Upper bound on pages fetched this run (a refresh keeps this small) */
  limit?: number;
  /** Pause between page fetches — Bring a Trailer is a shared resource */
  delayMs?: number;
  /** Only sales whose source_url contains this text */
  urlFilter?: string;
  /** Stop after this long even if pages remain (a serverless run has a hard ceiling) */
  timeBudgetMs?: number;
  log?: (message: string) => void;
  fetchImpl?: typeof fetch;
}

export interface FetchListingsSummary {
  candidates: number;
  fetched: number;
  failed: number;
  remaining: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn: () => Promise<void>, log: (m: string) => void, attempts = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await fn();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`  write failed (attempt ${attempt}/${attempts}): ${message}`);
      if (attempt < attempts) await sleep(2000 * attempt);
    }
  }
  return false;
}

/**
 * Fetch listing pages for Bring a Trailer sales that don't have one yet
 * (no `sale_listings` row, or only the excerpt). Oldest-first so a backfill
 * makes steady progress across runs; a refresh calls this with a small limit.
 */
export async function fetchMissingListings(options: FetchListingsOptions = {}): Promise<FetchListingsSummary> {
  const { limit = 25, delayMs = 2500, urlFilter, fetchImpl, timeBudgetMs } = options;
  const deadline = timeBudgetMs ? Date.now() + timeBudgetMs : Infinity;
  const log = options.log ?? (() => {});
  await ensureExtractionTables();

  const pending = await client.execute({
    sql: `SELECT s.id, s.source_url
          FROM sales s
          LEFT JOIN sale_listings l ON l.sale_id = s.id
          WHERE s.source = 'bat'
            AND s.source_url LIKE 'https://bringatrailer.com/listing/%'
            AND (l.sale_id IS NULL OR l.text_source = 'excerpt')
            ${urlFilter ? "AND s.source_url LIKE ?" : ""}
          ORDER BY s.sale_date DESC, s.id`,
    args: urlFilter ? [`%${urlFilter}%`] : [],
  });

  const candidates = pending.rows.map((r) => ({ id: String(r.id), url: String(r.source_url) }));
  const summary: FetchListingsSummary = { candidates: candidates.length, fetched: 0, failed: 0, remaining: 0 };
  const batch = candidates.slice(0, limit);
  log(`listing pages: ${candidates.length} pending, fetching up to ${batch.length}`);

  for (let i = 0; i < batch.length; i++) {
    if (Date.now() >= deadline) {
      log(`  stopping early — time budget spent, ${batch.length - i} left for next run`);
      break;
    }
    const { id, url } = batch[i];
    let result = await fetchBaTListing(url, fetchImpl);
    if (!result.ok && result.retryable) {
      // One retry after a long pause covers a 429 or a transient upstream error
      log(`  ${url} → ${result.status}, retrying in 30s`);
      await sleep(30_000);
      result = await fetchBaTListing(url, fetchImpl);
    }
    if (result.ok) {
      // Turso over HTTP occasionally returns a transient 400; a retry with a
      // fresh request is all it needs, and one bad write shouldn't end a run
      if (await withRetry(() => saveListingPage(id, result.listing), log)) {
        summary.fetched++;
        log(`  [${i + 1}/${batch.length}] ${result.listing.title} — ${result.listing.essentials.length} essentials, ${result.listing.description.length} chars`);
      } else {
        summary.failed++;
        log(`  [${i + 1}/${batch.length}] ${url} → database write failed`);
      }
    } else {
      summary.failed++;
      log(`  [${i + 1}/${batch.length}] ${url} → ${result.status}`);
      // Anything but a 404 is treated as "stop hammering the site for now"
      if (result.status !== 404) break;
    }
    if (i < batch.length - 1) await sleep(delayMs);
  }

  summary.remaining = candidates.length - summary.fetched;
  return summary;
}

export interface ListingCoverage {
  batSales: number;
  withListingPage: number;
  withExcerptOnly: number;
}

export async function getListingCoverage(): Promise<ListingCoverage> {
  await ensureExtractionTables();
  const res = await client.execute(`
    SELECT
      (SELECT COUNT(*) FROM sales WHERE source = 'bat') AS bat_sales,
      (SELECT COUNT(*) FROM sale_listings WHERE text_source = 'listing_page') AS with_page,
      (SELECT COUNT(*) FROM sale_listings WHERE text_source = 'excerpt') AS with_excerpt
  `);
  const r = res.rows[0];
  return {
    batSales: Number(r?.bat_sales ?? 0),
    withListingPage: Number(r?.with_page ?? 0),
    withExcerptOnly: Number(r?.with_excerpt ?? 0),
  };
}
