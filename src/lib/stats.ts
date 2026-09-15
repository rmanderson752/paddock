// Server-only — recomputes the precomputed tables (generation_stats and
// category_indices) from the raw sales records. Used by the admin dashboard,
// the `npm run db:stats` script and the refresh job.
//
// Reads all completed sales in one query and writes the results in one batch,
// so a full recompute is a handful of round trips even against Turso.

import { client, batchWrite, dbReady } from "./db";
import type { InStatement } from "@libsql/client";
import {
  computeStatsFromSales,
  median,
  quarterlyChange,
  todayIso,
  type SaleLike,
} from "./stats-core";

export const categoryDisplayNames: Record<string, string> = {
  jdm: "JDM Icons",
  supercar: "Supercars",
  retro: "Air-Cooled Porsche",
  modern_luxury: "Modern Luxury",
  modern_collectible: "Modern Collectibles",
  truck_suv: "Trucks & SUVs",
};

/** The date the dataset runs through — the most recent completed sale. */
export async function getDataAsOfDate(): Promise<string> {
  await dbReady();
  const res = await client.execute("SELECT MAX(sale_date) AS d FROM sales WHERE sold = 1");
  const d = res.rows[0]?.d;
  return typeof d === "string" && d ? d : todayIso();
}

/** All completed sales grouped by generation id. */
async function soldSalesByGeneration(): Promise<Map<string, SaleLike[]>> {
  const res = await client.execute(
    "SELECT generation_id, sale_price, sale_date, source FROM sales WHERE sold = 1"
  );
  const map = new Map<string, SaleLike[]>();
  for (const row of res.rows) {
    const id = String(row.generation_id);
    const list = map.get(id) ?? [];
    list.push({
      salePrice: Number(row.sale_price),
      saleDate: String(row.sale_date),
      source: String(row.source),
    });
    map.set(id, list);
  }
  return map;
}

const UPSERT_STATS = `
  INSERT INTO generation_stats (
    id, generation_id, last_sale_price, last_sale_date, last_sale_source,
    avg_price_12mo, high_52wk, low_52wk, sales_count_12mo,
    trend_direction, trend_percentage, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(generation_id) DO UPDATE SET
    last_sale_price = excluded.last_sale_price,
    last_sale_date = excluded.last_sale_date,
    last_sale_source = excluded.last_sale_source,
    avg_price_12mo = excluded.avg_price_12mo,
    high_52wk = excluded.high_52wk,
    low_52wk = excluded.low_52wk,
    sales_count_12mo = excluded.sales_count_12mo,
    trend_direction = excluded.trend_direction,
    trend_percentage = excluded.trend_percentage,
    updated_at = datetime('now')`;

/**
 * Recompute every generation's stats. Generations with no completed sales lose
 * their stats row, which hides them from browse/search until data arrives.
 */
export async function refreshAllGenerationStats(asOf?: string): Promise<{ updated: number; cleared: number }> {
  await dbReady();
  const end = asOf ?? (await getDataAsOfDate());
  const gens = (await client.execute("SELECT id FROM generations")).rows.map((r) => String(r.id));
  const salesByGen = await soldSalesByGeneration();

  const statements: InStatement[] = [];
  let updated = 0;
  let cleared = 0;
  for (const id of gens) {
    const stats = computeStatsFromSales(salesByGen.get(id) ?? [], end);
    if (!stats) {
      statements.push({ sql: "DELETE FROM generation_stats WHERE generation_id = ?", args: [id] });
      cleared++;
      continue;
    }
    statements.push({
      sql: UPSERT_STATS,
      args: [
        crypto.randomUUID(), id,
        stats.lastSalePrice, stats.lastSaleDate, stats.lastSaleSource,
        stats.avgPrice12mo, stats.high52wk, stats.low52wk, stats.salesCount12mo,
        stats.trendDirection, stats.trendPercentage,
      ],
    });
    updated++;
  }
  await batchWrite(statements);
  return { updated, cleared };
}

/** Recompute one generation (used after targeted data edits). */
export async function refreshGenerationStats(generationId: string, asOf?: string): Promise<boolean> {
  await dbReady();
  const end = asOf ?? (await getDataAsOfDate());
  const res = await client.execute({
    sql: "SELECT sale_price, sale_date, source FROM sales WHERE generation_id = ? AND sold = 1",
    args: [generationId],
  });
  const sales: SaleLike[] = res.rows.map((r) => ({
    salePrice: Number(r.sale_price), saleDate: String(r.sale_date), source: String(r.source),
  }));
  const stats = computeStatsFromSales(sales, end);
  if (!stats) {
    await client.execute({ sql: "DELETE FROM generation_stats WHERE generation_id = ?", args: [generationId] });
    return false;
  }
  await client.execute({
    sql: UPSERT_STATS,
    args: [
      crypto.randomUUID(), generationId,
      stats.lastSalePrice, stats.lastSaleDate, stats.lastSaleSource,
      stats.avgPrice12mo, stats.high52wk, stats.low52wk, stats.salesCount12mo,
      stats.trendDirection, stats.trendPercentage,
    ],
  });
  return true;
}

/**
 * Rebuild the category indices from real data.
 *
 * Index value: the median of the category's per-model 12-month average prices,
 * in hundreds of dollars — so "2,847" means a typical tracked model in that
 * category changes hands for roughly $284,700. A median keeps a single
 * eight-figure car from dominating the category.
 *
 * Quarterly change: equal-weighted median price change per model between the
 * two most recent 90-day windows; falls back to the mean model trend when too
 * few models sold in both windows.
 */
export async function refreshCategoryIndices(asOf?: string): Promise<number> {
  await dbReady();
  const end = asOf ?? (await getDataAsOfDate());

  const gens = (
    await client.execute(
      `SELECT g.id, g.category, s.avg_price_12mo AS avg, s.trend_percentage AS trend
       FROM generations g
       LEFT JOIN generation_stats s ON s.generation_id = g.id
       ORDER BY g.category`
    )
  ).rows.map((r) => ({
    id: String(r.id),
    category: String(r.category),
    avg: r.avg === null ? null : Number(r.avg),
    trend: r.trend === null ? null : Number(r.trend),
  }));
  const salesByGen = await soldSalesByGeneration();

  const categories = [...new Set(gens.map((g) => g.category))];
  const statements: InStatement[] = [];

  for (const category of categories) {
    // Only generations that currently have stats count as tracked models
    const tracked = gens.filter((g) => g.category === category && g.avg !== null);
    const avgs = tracked.map((g) => g.avg ?? 0).filter((v) => v > 0);
    const indexValue = avgs.length ? Math.round(median(avgs) / 10000) : 0;

    const categorySales = new Map<string, SaleLike[]>();
    for (const g of tracked) categorySales.set(g.id, salesByGen.get(g.id) ?? []);
    let change = quarterlyChange(categorySales, end);
    if (change === null) {
      const trends = tracked.map((g) => g.trend ?? 0);
      change = trends.length
        ? Math.round((trends.reduce((a, b) => a + b, 0) / trends.length) * 10) / 10
        : 0;
    }

    statements.push({
      sql: `INSERT INTO category_indices (id, category, display_name, index_value, change_quarterly, model_count, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(category) DO UPDATE SET
              display_name = excluded.display_name,
              index_value = excluded.index_value,
              change_quarterly = excluded.change_quarterly,
              model_count = excluded.model_count,
              updated_at = datetime('now')`,
      args: [
        crypto.randomUUID(), category, categoryDisplayNames[category] ?? category,
        indexValue, change, tracked.length,
      ],
    });
  }

  // Drop indices for categories that no longer have generations
  if (categories.length) {
    const placeholders = categories.map(() => "?").join(",");
    statements.push({
      sql: `DELETE FROM category_indices WHERE category NOT IN (${placeholders})`,
      args: categories,
    });
  }

  await batchWrite(statements);
  return categories.length;
}

export interface RefreshSummary {
  asOf: string;
  generationsUpdated: number;
  generationsCleared: number;
  categories: number;
}

/** Recompute everything derived from the sales table. */
export async function refreshAllStats(): Promise<RefreshSummary> {
  const asOf = await getDataAsOfDate();
  const { updated, cleared } = await refreshAllGenerationStats(asOf);
  const categories = await refreshCategoryIndices(asOf);
  return { asOf, generationsUpdated: updated, generationsCleared: cleared, categories };
}
