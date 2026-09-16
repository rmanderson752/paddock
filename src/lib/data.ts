// Server-only data layer — reads from SQLite/Turso via Drizzle
// DO NOT import this file from client components (use types.ts for shared types)
//
// Every query is a network round trip on Turso, so list pages fetch in one
// JOIN and per-id lookups are batched with inArray rather than looped.

import { db, searchFts, dbReady, ensureAuxTables } from "./db";
import { eq, desc, sql, like, or, and, gte, lte, asc, inArray } from "drizzle-orm";
import * as schema from "./db/schema";
import type {
  Make, Model, Sale, SaleDetails, ActiveListing,
  GenerationStats, CategoryIndex, GenerationWithDetails, MakeWithCount,
  PriceRange, Era,
} from "./types";
import { priceRanges, eras } from "./types";
import { median, shiftIsoDate } from "./stats-core";
import { getDataAsOfDate } from "./stats";

export { getDataAsOfDate };

// =============================================
// Shared helper: join generations + models + makes + stats in one query
// =============================================

type JoinedRow = {
  gen: typeof schema.generations.$inferSelect;
  model: typeof schema.models.$inferSelect;
  make: typeof schema.makes.$inferSelect;
  stats: typeof schema.generationStats.$inferSelect;
};

function rowToGenerationWithDetails(row: JoinedRow): GenerationWithDetails {
  return {
    id: row.gen.id,
    modelId: row.gen.modelId,
    name: row.gen.name,
    slug: row.gen.slug,
    yearStart: row.gen.yearStart,
    yearEnd: row.gen.yearEnd ?? null,
    chassisCode: row.gen.chassisCode ?? null,
    category: row.gen.category,
    description: row.gen.description ?? null,
    imageUrl: row.gen.imageUrl ?? null,
    make: { id: row.make.id, name: row.make.name, slug: row.make.slug },
    model: { id: row.model.id, makeId: row.model.makeId, name: row.model.name, slug: row.model.slug },
    stats: {
      generationId: row.stats.generationId,
      lastSalePrice: row.stats.lastSalePrice ?? 0,
      lastSaleDate: row.stats.lastSaleDate ?? "",
      lastSaleSource: row.stats.lastSaleSource ?? "",
      avgPrice12mo: row.stats.avgPrice12mo ?? 0,
      high52wk: row.stats.high52wk ?? 0,
      low52wk: row.stats.low52wk ?? 0,
      salesCount12mo: row.stats.salesCount12mo ?? 0,
      trendDirection: (row.stats.trendDirection as GenerationStats["trendDirection"]) ?? "stable",
      trendPercentage: row.stats.trendPercentage ?? 0,
    },
  };
}

function baseQuery() {
  return db
    .select({
      gen: schema.generations,
      model: schema.models,
      make: schema.makes,
      stats: schema.generationStats,
    })
    .from(schema.generations)
    .innerJoin(schema.models, eq(schema.generations.modelId, schema.models.id))
    .innerJoin(schema.makes, eq(schema.models.makeId, schema.makes.id))
    .innerJoin(schema.generationStats, eq(schema.generationStats.generationId, schema.generations.id));
}

// =============================================
// Single-entity lookups
// =============================================

export async function getMake(id: string): Promise<Make | undefined> {
  await dbReady();
  const row = await db.select().from(schema.makes).where(eq(schema.makes.id, id)).get();
  return row ? { id: row.id, name: row.name, slug: row.slug } : undefined;
}

export async function getMakeBySlug(slug: string): Promise<Make | undefined> {
  await dbReady();
  const row = await db.select().from(schema.makes).where(eq(schema.makes.slug, slug)).get();
  return row ? { id: row.id, name: row.name, slug: row.slug } : undefined;
}

export async function getModel(id: string): Promise<Model | undefined> {
  await dbReady();
  const row = await db.select().from(schema.models).where(eq(schema.models.id, id)).get();
  return row ? { id: row.id, makeId: row.makeId, name: row.name, slug: row.slug } : undefined;
}

export async function getGenerationWithDetails(id: string): Promise<GenerationWithDetails | null> {
  await dbReady();
  const row = await baseQuery().where(eq(schema.generations.id, id)).get();
  return row ? rowToGenerationWithDetails(row) : null;
}

/** Several generations in one query; missing ids are skipped, input order kept. */
export async function getGenerationsWithDetailsByIds(ids: string[]): Promise<GenerationWithDetails[]> {
  if (ids.length === 0) return [];
  await dbReady();
  const rows = await baseQuery().where(inArray(schema.generations.id, ids)).all();
  const byId = new Map(rows.map((r) => [r.gen.id, rowToGenerationWithDetails(r)]));
  return ids.map((id) => byId.get(id)).filter((g): g is GenerationWithDetails => !!g);
}

// =============================================
// Sales
// =============================================

/**
 * Completed sales for a generation, oldest first. Bid-not-met listings stay in
 * the database for the record but are never shown as sales.
 */
export async function getSalesForGeneration(
  generationId: string,
  timeframe?: string,
  asOf?: string
): Promise<Sale[]> {
  await ensureAuxTables();
  const conditions = [eq(schema.sales.generationId, generationId), eq(schema.sales.sold, true)];

  const years: Record<string, number> = { "1y": 1, "3y": 3, "5y": 5 };
  if (timeframe && years[timeframe]) {
    const end = asOf ?? (await getDataAsOfDate());
    conditions.push(gte(schema.sales.saleDate, shiftIsoDate(end, { years: -years[timeframe] })));
  }

  const rows = await db
    .select({ sale: schema.sales, details: schema.saleDetails })
    .from(schema.sales)
    .leftJoin(schema.saleDetails, eq(schema.saleDetails.saleId, schema.sales.id))
    .where(and(...conditions))
    .orderBy(schema.sales.saleDate)
    .all();

  return rows.map((r) => rowToSale(r.sale, r.details));
}

function parseJsonList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function rowToDetails(row: typeof schema.saleDetails.$inferSelect | null | undefined): SaleDetails | null {
  if (!row) return null;
  return {
    colorFamily: row.colorFamily ?? null,
    mileageTmu: row.mileageTmu ?? false,
    transmission: (row.transmission as SaleDetails["transmission"]) ?? null,
    transmissionDetail: row.transmissionDetail ?? null,
    engine: row.engine ?? null,
    owners: row.owners ?? null,
    yearsOwned: row.yearsOwned ?? null,
    titleStatus: row.titleStatus ?? null,
    flags: parseJsonList(row.flags),
    summary: row.summary,
  };
}

function rowToSale(row: typeof schema.sales.$inferSelect, details?: typeof schema.saleDetails.$inferSelect | null): Sale {
  return {
    id: row.id,
    generationId: row.generationId,
    salePrice: row.salePrice,
    saleDate: row.saleDate,
    source: row.source,
    sourceUrl: row.sourceUrl ?? null,
    year: row.year ?? null,
    mileage: row.mileage ?? null,
    color: row.color ?? null,
    conditionNotes: row.conditionNotes ?? null,
    sold: row.sold ?? true,
    details: rowToDetails(details),
  };
}

export function getActiveListingsForGeneration(): ActiveListing[] {
  // No active listings table yet — only scraped completed auctions
  return [];
}

// =============================================
// Collection queries (optimized with JOINs)
// =============================================

export async function getAllGenerationsWithDetails(): Promise<GenerationWithDetails[]> {
  await dbReady();
  return (await baseQuery().all()).map(rowToGenerationWithDetails);
}

export async function getGenerationsByCategory(category: string): Promise<GenerationWithDetails[]> {
  await dbReady();
  const rows = await baseQuery().where(eq(schema.generations.category, category)).all();
  return rows.map(rowToGenerationWithDetails);
}

export async function getGenerationsByMakeSlug(makeSlug: string): Promise<GenerationWithDetails[]> {
  await dbReady();
  const rows = await baseQuery().where(eq(schema.makes.slug, makeSlug)).all();
  return rows.map(rowToGenerationWithDetails);
}

export async function getGenerationsByMake(makeId: string): Promise<GenerationWithDetails[]> {
  await dbReady();
  const rows = await baseQuery().where(eq(schema.makes.id, makeId)).all();
  return rows.map(rowToGenerationWithDetails);
}

export async function getTopMovers(direction: "gainers" | "losers", limit = 8): Promise<GenerationWithDetails[]> {
  await dbReady();
  const orderCol = direction === "gainers"
    ? desc(schema.generationStats.trendPercentage)
    : asc(schema.generationStats.trendPercentage);

  const rows = await baseQuery().orderBy(orderCol).limit(limit).all();
  return rows.map(rowToGenerationWithDetails);
}

/** Latest completed sales with their car, in one query. */
export async function getRecentSales(limit = 10): Promise<(Sale & { generation: GenerationWithDetails })[]> {
  await ensureAuxTables();
  const rows = await db
    .select({
      sale: schema.sales,
      details: schema.saleDetails,
      gen: schema.generations,
      model: schema.models,
      make: schema.makes,
      stats: schema.generationStats,
    })
    .from(schema.sales)
    .leftJoin(schema.saleDetails, eq(schema.saleDetails.saleId, schema.sales.id))
    .innerJoin(schema.generations, eq(schema.sales.generationId, schema.generations.id))
    .innerJoin(schema.models, eq(schema.generations.modelId, schema.models.id))
    .innerJoin(schema.makes, eq(schema.models.makeId, schema.makes.id))
    .innerJoin(schema.generationStats, eq(schema.generationStats.generationId, schema.generations.id))
    .where(eq(schema.sales.sold, true))
    .orderBy(desc(schema.sales.saleDate), desc(schema.sales.createdAt))
    .limit(limit)
    .all();

  return rows.map((r) => ({ ...rowToSale(r.sale, r.details), generation: rowToGenerationWithDetails(r) }));
}

export async function searchGenerations(query: string): Promise<GenerationWithDetails[]> {
  if (!query || query.length < 2) return [];
  await dbReady();

  // Try FTS5 first for ranked results
  const ftsIds = await searchFts(query);
  if (ftsIds.length > 0) {
    const rows = await baseQuery().where(inArray(schema.generations.id, ftsIds)).all();
    return rows
      .map(rowToGenerationWithDetails)
      // Preserve FTS rank order
      .sort((a, b) => ftsIds.indexOf(a.id) - ftsIds.indexOf(b.id));
  }

  // Fallback to LIKE search
  const pattern = `%${query}%`;
  const rows = await baseQuery()
    .where(
      or(
        like(schema.makes.name, pattern),
        like(schema.models.name, pattern),
        like(schema.generations.name, pattern),
        like(schema.generations.chassisCode, pattern),
        like(schema.generations.category, pattern),
      )
    )
    .all();
  return rows.map(rowToGenerationWithDetails);
}

export async function findGenerationBySlug(
  makeSlug: string,
  modelSlug: string,
  genSlug: string
): Promise<GenerationWithDetails | null> {
  await dbReady();
  const row = await baseQuery()
    .where(and(
      eq(schema.makes.slug, makeSlug),
      eq(schema.models.slug, modelSlug),
      eq(schema.generations.slug, genSlug),
    ))
    .get();
  return row ? rowToGenerationWithDetails(row) : null;
}

// =============================================
// Browse helpers
// =============================================

export async function getAllMakes(): Promise<Make[]> {
  await dbReady();
  const rows = await db.select().from(schema.makes).orderBy(schema.makes.name).all();
  return rows.map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
}

export async function getAllMakesWithCounts(): Promise<MakeWithCount[]> {
  await dbReady();
  const rows = await db
    .select({
      makeId: schema.makes.id,
      makeName: schema.makes.name,
      makeSlug: schema.makes.slug,
      modelCount: sql<number>`COUNT(DISTINCT ${schema.models.id})`,
      generationCount: sql<number>`COUNT(DISTINCT ${schema.generations.id})`,
    })
    .from(schema.makes)
    .innerJoin(schema.models, eq(schema.models.makeId, schema.makes.id))
    .innerJoin(schema.generations, eq(schema.generations.modelId, schema.models.id))
    .innerJoin(schema.generationStats, eq(schema.generationStats.generationId, schema.generations.id))
    .groupBy(schema.makes.id)
    .orderBy(schema.makes.name)
    .all();

  return rows.map((row) => ({
    make: { id: row.makeId, name: row.makeName, slug: row.makeSlug },
    modelCount: Number(row.modelCount),
    generationCount: Number(row.generationCount),
  }));
}

export async function getGenerationsByPriceRange(range: PriceRange): Promise<GenerationWithDetails[]> {
  const pr = priceRanges.find((r) => r.value === range);
  if (!pr) return [];
  await dbReady();
  const rows = await baseQuery()
    .where(and(
      gte(schema.generationStats.avgPrice12mo, pr.min),
      lte(schema.generationStats.avgPrice12mo, pr.max),
    ))
    .all();
  return rows.map(rowToGenerationWithDetails);
}

export async function getGenerationsByEra(era: Era): Promise<GenerationWithDetails[]> {
  const e = eras.find((r) => r.value === era);
  if (!e) return [];
  await dbReady();
  const rows = await baseQuery()
    .where(and(
      gte(schema.generations.yearStart, e.yearMin),
      lte(schema.generations.yearStart, e.yearMax),
    ))
    .all();
  return rows.map(rowToGenerationWithDetails);
}

// =============================================
// Sparkline helpers
// =============================================

/** Last 12 months of completed sale prices per generation, one query. */
export async function getSparklineDataForGenerations(
  generationIds: string[]
): Promise<Record<string, number[]>> {
  const result: Record<string, number[]> = {};
  for (const id of generationIds) result[id] = [];
  if (generationIds.length === 0) return result;

  await dbReady();
  const cutoffStr = shiftIsoDate(await getDataAsOfDate(), { years: -1 });
  const rows = await db
    .select({ generationId: schema.sales.generationId, salePrice: schema.sales.salePrice })
    .from(schema.sales)
    .where(and(
      inArray(schema.sales.generationId, generationIds),
      gte(schema.sales.saleDate, cutoffStr),
      eq(schema.sales.sold, true),
    ))
    .orderBy(schema.sales.saleDate)
    .all();

  for (const r of rows) result[r.generationId]?.push(r.salePrice);
  return result;
}

// =============================================
// Category indices
// =============================================

export async function getCategoryIndices(): Promise<CategoryIndex[]> {
  await dbReady();
  const rows = await db.select().from(schema.categoryIndices).all();
  return rows.map((row) => ({
    category: row.category,
    displayName: row.displayName,
    indexValue: row.indexValue ?? 0,
    changeQuarterly: row.changeQuarterly ?? 0,
    modelCount: row.modelCount ?? 0,
  }));
}

/**
 * Relative monthly price level per category over the last 12 months, for the
 * index sparklines. Each generation's monthly median is normalised to its own
 * 12-month average, then averaged across the generations that sold that month,
 * so a month of expensive cars selling doesn't read as the category rising.
 */
export async function getCategoryMonthlySeries(): Promise<Record<string, number[]>> {
  await dbReady();
  const asOf = await getDataAsOfDate();
  const cutoff = shiftIsoDate(asOf, { years: -1 });

  const rows = await db
    .select({
      category: schema.generations.category,
      generationId: schema.sales.generationId,
      month: sql<string>`substr(${schema.sales.saleDate}, 1, 7)`,
      price: schema.sales.salePrice,
      avg: schema.generationStats.avgPrice12mo,
    })
    .from(schema.sales)
    .innerJoin(schema.generations, eq(schema.sales.generationId, schema.generations.id))
    .innerJoin(schema.generationStats, eq(schema.generationStats.generationId, schema.generations.id))
    .where(and(eq(schema.sales.sold, true), gte(schema.sales.saleDate, cutoff), lte(schema.sales.saleDate, asOf)))
    .all();

  // category → month → generation → prices
  const tree = new Map<string, Map<string, Map<string, { prices: number[]; avg: number }>>>();
  for (const r of rows) {
    if (!r.avg) continue;
    const months = tree.get(r.category) ?? new Map();
    tree.set(r.category, months);
    const gens = months.get(r.month) ?? new Map();
    months.set(r.month, gens);
    const entry = gens.get(r.generationId) ?? { prices: [], avg: r.avg };
    entry.prices.push(r.price);
    gens.set(r.generationId, entry);
  }

  const result: Record<string, number[]> = {};
  for (const [category, months] of tree) {
    const series = [...months.keys()].sort().map((m) => {
      const levels = [...months.get(m)!.values()].map((g) => median(g.prices) / g.avg);
      return levels.reduce((a, b) => a + b, 0) / levels.length;
    });
    result[category] = series;
  }
  return result;
}
