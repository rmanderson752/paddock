// Persistence for extraction: which sales still need a run, writing results
// with their provenance, and promoting the reliable fields onto `sales` so
// the rest of the app (charts, filters, sale record) benefits without knowing
// the pipeline exists.

import { client, batchWrite } from "../db";
import { ensureExtractionTables, type SaleListing } from "../listings";
import { extractionInputHash } from "./prompt";
import { pruneBoilerplate } from "./prune";
import { CONDITION_FLAGS, type ConditionFlag, type ExtractionInput } from "./schema";
import type { ExtractionResult } from "./extract";
import type { InStatement } from "@libsql/client";

export interface PendingSale {
  saleId: string;
  input: ExtractionInput;
  inputHash: string;
  textSource: SaleListing["textSource"];
}

export interface PendingOptions {
  model: string;
  limit?: number;
  /** Extract from the one-line excerpt when the listing page hasn't been fetched (default: wait for the page) */
  includeExcerptOnly?: boolean;
  /** Restrict to these sale ids (eval / targeted re-runs) */
  saleIds?: string[];
  /** Bid-not-met listings are never shown as sales; skip them unless asked (default true) */
  soldOnly?: boolean;
}

function carLabel(row: Record<string, unknown>): string {
  const years = `${row.year_start}–${row.year_end ?? "present"}`;
  return `${row.make_name} ${row.model_name} — ${row.gen_name} (${years})`;
}

/** The model input for one listing row: stored text, boilerplate pruned. */
function rowToInput(row: Record<string, unknown>): ExtractionInput {
  let essentials: string[] = [];
  if (typeof row.essentials === "string") {
    try {
      essentials = JSON.parse(row.essentials);
    } catch {
      essentials = [];
    }
  }
  const description = row.description === null || row.description === undefined ? "" : String(row.description);
  return {
    title: String(row.title),
    essentials,
    description: pruneBoilerplate(description).text,
    closedOn: row.sale_date === null || row.sale_date === undefined ? null : String(row.sale_date),
    car: carLabel(row),
  };
}

/**
 * Sales whose listing text has no extraction yet for this prompt version and
 * model, or whose text changed since (the excerpt was replaced by the page).
 * Newest sales first, so a capped refresh run covers what users see first.
 */
export async function getPendingSales(options: PendingOptions): Promise<PendingSale[]> {
  const { model, limit = 50, includeExcerptOnly = false, saleIds, soldOnly = true } = options;
  await ensureExtractionTables();
  const where: string[] = [];
  const args: string[] = [];
  if (saleIds && saleIds.length) {
    where.push(`s.id IN (${saleIds.map(() => "?").join(",")})`);
    args.push(...saleIds);
  }
  if (soldOnly) where.push("s.sold = 1");
  const res = await client.execute({
    sql: `SELECT s.id, s.sale_date, l.title, l.essentials, l.description, l.text_source,
                 d.input_hash AS existing_hash,
                 mk.name AS make_name, m.name AS model_name, g.name AS gen_name, g.year_start, g.year_end
          FROM sales s
          JOIN sale_listings l ON l.sale_id = s.id
          JOIN generations g ON g.id = s.generation_id
          JOIN models m ON m.id = g.model_id
          JOIN makes mk ON mk.id = m.make_id
          LEFT JOIN sale_details d ON d.sale_id = s.id
          ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY s.sale_date DESC, s.id`,
    args,
  });

  const pending: PendingSale[] = [];
  for (const raw of res.rows) {
    const row = raw as Record<string, unknown>;
    const textSource = row.text_source as SaleListing["textSource"];
    if (textSource === "excerpt" && !includeExcerptOnly) continue;
    const input = rowToInput(row);
    const inputHash = extractionInputHash(input, model);
    if (row.existing_hash === inputHash) continue;
    pending.push({ saleId: String(row.id), input, inputHash, textSource });
    if (pending.length >= limit) break;
  }
  return pending;
}

/** Extraction inputs for specific listings, keyed by source URL (the eval's golden set). */
export async function getExtractionInputsByUrls(urls: string[]): Promise<Map<string, { saleId: string; input: ExtractionInput; textSource: SaleListing["textSource"] }>> {
  const out = new Map<string, { saleId: string; input: ExtractionInput; textSource: SaleListing["textSource"] }>();
  if (urls.length === 0) return out;
  await ensureExtractionTables();
  const CHUNK = 100;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const chunk = urls.slice(i, i + CHUNK);
    const res = await client.execute({
      sql: `SELECT s.id, s.source_url, s.sale_date, l.title, l.essentials, l.description, l.text_source,
                   mk.name AS make_name, m.name AS model_name, g.name AS gen_name, g.year_start, g.year_end
            FROM sales s
            JOIN sale_listings l ON l.sale_id = s.id
            JOIN generations g ON g.id = s.generation_id
            JOIN models m ON m.id = g.model_id
            JOIN makes mk ON mk.id = m.make_id
            WHERE s.source_url IN (${chunk.map(() => "?").join(",")})`,
      args: chunk,
    });
    for (const raw of res.rows) {
      const row = raw as Record<string, unknown>;
      out.set(String(row.source_url), {
        saleId: String(row.id),
        textSource: row.text_source as SaleListing["textSource"],
        input: rowToInput(row),
      });
    }
  }
  return out;
}

function detailsStatement(saleId: string, r: ExtractionResult): InStatement {
  const d = r.data;
  return {
    sql: `INSERT INTO sale_details (
            sale_id, mileage, mileage_unit, mileage_tmu, exterior_color, color_family, interior_color,
            transmission, transmission_detail, engine, owners, years_owned, title_status,
            flags, modifications, notable_options, summary,
            model, prompt_version, input_hash, raw_json,
            input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, latency_ms, extracted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sale_id) DO UPDATE SET
            mileage = excluded.mileage, mileage_unit = excluded.mileage_unit, mileage_tmu = excluded.mileage_tmu,
            exterior_color = excluded.exterior_color, color_family = excluded.color_family, interior_color = excluded.interior_color,
            transmission = excluded.transmission, transmission_detail = excluded.transmission_detail, engine = excluded.engine,
            owners = excluded.owners, years_owned = excluded.years_owned, title_status = excluded.title_status,
            flags = excluded.flags, modifications = excluded.modifications, notable_options = excluded.notable_options,
            summary = excluded.summary, model = excluded.model, prompt_version = excluded.prompt_version,
            input_hash = excluded.input_hash, raw_json = excluded.raw_json,
            input_tokens = excluded.input_tokens, output_tokens = excluded.output_tokens,
            cache_read_tokens = excluded.cache_read_tokens, cache_write_tokens = excluded.cache_write_tokens,
            cost_usd = excluded.cost_usd, latency_ms = excluded.latency_ms, extracted_at = excluded.extracted_at`,
    args: [
      saleId,
      d.mileage,
      d.mileage_unit,
      d.mileage_tmu ? 1 : 0,
      d.exterior_color,
      d.color_family,
      d.interior_color,
      d.transmission,
      d.transmission_detail,
      d.engine,
      d.owners,
      d.years_owned,
      d.title_status,
      JSON.stringify(d.flags),
      JSON.stringify(d.modifications),
      JSON.stringify(d.notable_options),
      d.summary,
      r.model,
      r.promptVersion,
      r.inputHash,
      r.rawJson,
      r.usage.inputTokens,
      r.usage.outputTokens,
      r.usage.cacheReadTokens,
      r.usage.cacheWriteTokens,
      r.costUsd,
      r.latencyMs,
      new Date().toISOString(),
    ],
  };
}

export async function saveExtractions(rows: { saleId: string; result: ExtractionResult }[]): Promise<void> {
  if (rows.length === 0) return;
  await ensureExtractionTables();
  await batchWrite(rows.map((r) => detailsStatement(r.saleId, r.result)));
}

/**
 * Copy the fields the rest of the app reads onto `sales`: odometer reading
 * (in miles), the seller's colour name and the one-line summary in place of
 * the old truncated excerpt. Idempotent; runs after every extraction.
 */
export async function promoteDetailsToSales(saleIds?: string[]): Promise<number> {
  await ensureExtractionTables();
  const res = await client.execute({
    sql: `SELECT sale_id, mileage, mileage_unit, exterior_color, summary FROM sale_details
          ${saleIds && saleIds.length ? `WHERE sale_id IN (${saleIds.map(() => "?").join(",")})` : ""}`,
    args: saleIds && saleIds.length ? saleIds : [],
  });
  const statements: InStatement[] = res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const raw = r.mileage === null ? null : Number(r.mileage);
    const miles = raw === null ? null : r.mileage_unit === "km" ? Math.round(raw * 0.621371) : raw;
    return {
      sql: `UPDATE sales SET
              mileage = COALESCE(?, mileage),
              color = COALESCE(?, color),
              condition_notes = COALESCE(NULLIF(?, ''), condition_notes),
              updated_at = datetime('now')
            WHERE id = ?`,
      args: [miles, r.exterior_color === null ? null : String(r.exterior_color), String(r.summary ?? ""), String(r.sale_id)],
    };
  });
  await batchWrite(statements);
  return statements.length;
}

// ─── Reads for the app ───────────────────────────────────────────────

export interface SaleDetailsRecord {
  saleId: string;
  mileage: number | null;
  mileageUnit: "mi" | "km" | null;
  mileageTmu: boolean;
  exteriorColor: string | null;
  colorFamily: string | null;
  interiorColor: string | null;
  transmission: "manual" | "automatic" | null;
  transmissionDetail: string | null;
  engine: string | null;
  owners: number | null;
  yearsOwned: number | null;
  titleStatus: string | null;
  flags: ConditionFlag[];
  modifications: string[];
  notableOptions: string[];
  summary: string;
  model: string;
  promptVersion: string;
  extractedAt: string;
}

function parseList(v: unknown): string[] {
  if (typeof v !== "string") return [];
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function rowToDetails(r: Record<string, unknown>): SaleDetailsRecord {
  const flagSet = new Set<string>(CONDITION_FLAGS);
  return {
    saleId: String(r.sale_id),
    mileage: num(r.mileage),
    mileageUnit: (str(r.mileage_unit) as "mi" | "km" | null) ?? null,
    mileageTmu: Number(r.mileage_tmu ?? 0) === 1,
    exteriorColor: str(r.exterior_color),
    colorFamily: str(r.color_family),
    interiorColor: str(r.interior_color),
    transmission: (str(r.transmission) as "manual" | "automatic" | null) ?? null,
    transmissionDetail: str(r.transmission_detail),
    engine: str(r.engine),
    owners: num(r.owners),
    yearsOwned: num(r.years_owned),
    titleStatus: str(r.title_status),
    flags: parseList(r.flags).filter((f): f is ConditionFlag => flagSet.has(f)),
    modifications: parseList(r.modifications),
    notableOptions: parseList(r.notable_options),
    summary: String(r.summary ?? ""),
    model: String(r.model ?? ""),
    promptVersion: String(r.prompt_version ?? ""),
    extractedAt: String(r.extracted_at ?? ""),
  };
}

export async function getDetailsForSales(saleIds: string[]): Promise<Map<string, SaleDetailsRecord>> {
  const out = new Map<string, SaleDetailsRecord>();
  if (saleIds.length === 0) return out;
  await ensureExtractionTables();
  const CHUNK = 200;
  for (let i = 0; i < saleIds.length; i += CHUNK) {
    const ids = saleIds.slice(i, i + CHUNK);
    const res = await client.execute({
      sql: `SELECT * FROM sale_details WHERE sale_id IN (${ids.map(() => "?").join(",")})`,
      args: ids,
    });
    for (const r of res.rows) out.set(String(r.sale_id), rowToDetails(r as Record<string, unknown>));
  }
  return out;
}

export interface ExtractionCoverage {
  extracted: number;
  byModel: { model: string; promptVersion: string; count: number; costUsd: number; avgLatencyMs: number | null }[];
  totalCostUsd: number;
  lastExtractedAt: string | null;
}

export async function getExtractionCoverage(): Promise<ExtractionCoverage> {
  await ensureExtractionTables();
  const res = await client.execute(`
    SELECT model, prompt_version, COUNT(*) AS n, COALESCE(SUM(cost_usd), 0) AS cost,
           AVG(NULLIF(latency_ms, 0)) AS latency, MAX(extracted_at) AS last_at
    FROM sale_details GROUP BY model, prompt_version ORDER BY n DESC
  `);
  const byModel = res.rows.map((r) => ({
    model: String(r.model),
    promptVersion: String(r.prompt_version),
    count: Number(r.n),
    costUsd: Number(r.cost),
    avgLatencyMs: r.latency === null ? null : Math.round(Number(r.latency)),
  }));
  const lastAt = res.rows.map((r) => str(r.last_at)).filter((x): x is string => !!x).sort().pop() ?? null;
  return {
    extracted: byModel.reduce((a, b) => a + b.count, 0),
    byModel,
    totalCostUsd: byModel.reduce((a, b) => a + b.costUsd, 0),
    lastExtractedAt: lastAt,
  };
}
