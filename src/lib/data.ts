// Server-only data layer — reads from SQLite via Drizzle
// DO NOT import this file from client components (use types.ts for shared types)

import { db, searchFts } from "./db";
import { eq, desc, sql, like, or, and, gte, lte, asc, inArray } from "drizzle-orm";
import * as schema from "./db/schema";
import type {
  Make, Model, Sale, ActiveListing,
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

export function getMake(id: string): Make | undefined {
  const row = db.select().from(schema.makes).where(eq(schema.makes.id, id)).get();
  return row ? { id: row.id, name: row.name, slug: row.slug } : undefined;
}

export function getMakeBySlug(slug: string): Make | undefined {
  const row = db.select().from(schema.makes).where(eq(schema.makes.slug, slug)).get();
  return row ? { id: row.id, name: row.name, slug: row.slug } : undefined;
}

export function getModel(id: string): Model | undefined {
  const row = db.select().from(schema.models).where(eq(schema.models.id, id)).get();
  return row ? { id: row.id, makeId: row.makeId, name: row.name, slug: row.slug } : undefined;
}

export function getGenerationWithDetails(id: string): GenerationWithDetails | null {
  const row = baseQuery()
    .where(eq(schema.generations.id, id))
    .get();
  return row ? rowToGenerationWithDetails(row) : null;
}

// =============================================
// Sales
// =============================================

/**
 * Completed sales for a generation, oldest first. Bid-not-met listings stay in
 * the database for the record but are never shown as sales.
 */
export function getSalesForGeneration(
  generationId: string,
  timeframe?: string,
  asOf?: string
): Sale[] {
  const conditions = [eq(schema.sales.generationId, generationId), eq(schema.sales.sold, true)];

  const years: Record<string, number> = { "1y": 1, "3y": 3, "5y": 5 };
  if (timeframe && years[timeframe]) {
    const end = asOf ?? getDataAsOfDate();
    conditions.push(gte(schema.sales.saleDate, shiftIsoDate(end, { years: -years[timeframe] })));
  }

  const rows = db.select().from(schema.sales)
    .where(and(...conditions))
    .orderBy(schema.sales.saleDate)
    .all();

  return rows.map(rowToSale);
}

function rowToSale(row: typeof schema.sales.$inferSelect): Sale {
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
  };
}

export function getActiveListingsForGeneration(): ActiveListing[] {
  // No active listings table yet — only scraped completed auctions
  return [];
}

// =============================================
// Collection queries (optimized with JOINs)
// =============================================

export function getAllGenerationsWithDetails(): GenerationWithDetails[] {
  return baseQuery().all().map(rowToGenerationWithDetails);
}

export function getGenerationsByCategory(category: string): GenerationWithDetails[] {
  return baseQuery()
    .where(eq(schema.generations.category, category))
    .all()
    .map(rowToGenerationWithDetails);
}

export function getGenerationsByMakeSlug(makeSlug: string): GenerationWithDetails[] {
  return baseQuery()
    .where(eq(schema.makes.slug, makeSlug))
    .all()
    .map(rowToGenerationWithDetails);
}

export function getGenerationsByMake(makeId: string): GenerationWithDetails[] {
  return baseQuery()
    .where(eq(schema.makes.id, makeId))
    .all()
    .map(rowToGenerationWithDetails);
}

export function getTopMovers(direction: "gainers" | "losers", limit = 8): GenerationWithDetails[] {
  const orderCol = direction === "gainers"
    ? desc(schema.generationStats.trendPercentage)
    : asc(schema.generationStats.trendPercentage);

  return baseQuery()
    .orderBy(orderCol)
    .limit(limit)
    .all()
    .map(rowToGenerationWithDetails);
}

export function getRecentSales(limit = 10): (Sale & { generation: GenerationWithDetails })[] {
  const rows = db.select().from(schema.sales)
    .where(eq(schema.sales.sold, true))
    .orderBy(desc(schema.sales.saleDate))
    .limit(limit * 3)
    .all();

  const results: (Sale & { generation: GenerationWithDetails })[] = [];
  for (const row of rows) {
    if (results.length >= limit) break;
    const gen = getGenerationWithDetails(row.generationId);
    if (gen) {
      results.push({ ...rowToSale(row), generation: gen });
    }
  }
  return results;
}

export function searchGenerations(query: string): GenerationWithDetails[] {
  if (!query || query.length < 2) return [];

  // Try FTS5 first for ranked results
  const ftsIds = searchFts(query);
  if (ftsIds.length > 0) {
    return baseQuery()
      .where(inArray(schema.generations.id, ftsIds))
      .all()
      .map(rowToGenerationWithDetails)
      // Preserve FTS rank order
      .sort((a, b) => ftsIds.indexOf(a.id) - ftsIds.indexOf(b.id));
  }

  // Fallback to LIKE search
  const pattern = `%${query}%`;
  return baseQuery()
    .where(
      or(
        like(schema.makes.name, pattern),
        like(schema.models.name, pattern),
        like(schema.generations.name, pattern),
        like(schema.generations.chassisCode, pattern),
        like(schema.generations.category, pattern),
      )
    )
    .all()
    .map(rowToGenerationWithDetails);
}

export function findGenerationBySlug(
  makeSlug: string,
  modelSlug: string,
  genSlug: string
): GenerationWithDetails | null {
  const row = baseQuery()
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

export function getAllMakes(): Make[] {
  return db.select().from(schema.makes)
    .orderBy(schema.makes.name)
    .all()
    .map((row) => ({ id: row.id, name: row.name, slug: row.slug }));
}

export function getAllMakesWithCounts(): MakeWithCount[] {
  const rows = db
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
    modelCount: row.modelCount,
    generationCount: row.generationCount,
  }));
}

export function getGenerationsByPriceRange(range: PriceRange): GenerationWithDetails[] {
  const pr = priceRanges.find((r) => r.value === range);
  if (!pr) return [];
  return baseQuery()
    .where(and(
      gte(schema.generationStats.avgPrice12mo, pr.min),
      lte(schema.generationStats.avgPrice12mo, pr.max),
    ))
    .all()
    .map(rowToGenerationWithDetails);
}

export function getGenerationsByEra(era: Era): GenerationWithDetails[] {
  const e = eras.find((r) => r.value === era);
  if (!e) return [];
  return baseQuery()
    .where(and(
      gte(schema.generations.yearStart, e.yearMin),
      lte(schema.generations.yearStart, e.yearMax),
    ))
    .all()
    .map(rowToGenerationWithDetails);
}

// =============================================
// Sparkline helpers
// =============================================

export function getSparklineDataForGenerations(
  generationIds: string[]
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  const cutoffStr = shiftIsoDate(getDataAsOfDate(), { years: -1 });

  for (const id of generationIds) {
    const rows = db.select({ salePrice: schema.sales.salePrice })
      .from(schema.sales)
      .where(and(
        eq(schema.sales.generationId, id),
        gte(schema.sales.saleDate, cutoffStr),
        eq(schema.sales.sold, true),
      ))
      .orderBy(schema.sales.saleDate)
      .all();
    result[id] = rows.map((r) => r.salePrice);
  }
  return result;
}

// =============================================
// Category indices
// =============================================

export function getCategoryIndices(): CategoryIndex[] {
  const rows = db.select().from(schema.categoryIndices).all();
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
export function getCategoryMonthlySeries(): Record<string, number[]> {
  const asOf = getDataAsOfDate();
  const cutoff = shiftIsoDate(asOf, { years: -1 });

  const rows = db
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
