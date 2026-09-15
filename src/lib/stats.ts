// Server-only — recomputes the precomputed tables (generation_stats and
// category_indices) from the raw sales records. Used by the admin dashboard,
// the `npm run db:stats` script and the scrapers after they insert data.

import { sqlite } from "./db";
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
export function getDataAsOfDate(): string {
  const row = sqlite
    .prepare("SELECT MAX(sale_date) AS d FROM sales WHERE sold = 1")
    .get() as { d: string | null } | undefined;
  return row?.d ?? todayIso();
}

function soldSalesFor(generationId: string): SaleLike[] {
  return sqlite
    .prepare(
      "SELECT sale_price AS salePrice, sale_date AS saleDate, source FROM sales WHERE generation_id = ? AND sold = 1"
    )
    .all(generationId) as SaleLike[];
}

const upsertStats = sqlite.prepare(`
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
    updated_at = datetime('now')
`);

/**
 * Recompute one generation's stats. Generations with no completed sales lose
 * their stats row, which hides them from browse/search until data arrives.
 */
export function refreshGenerationStats(generationId: string, asOf = getDataAsOfDate()): boolean {
  const stats = computeStatsFromSales(soldSalesFor(generationId), asOf);
  if (!stats) {
    sqlite.prepare("DELETE FROM generation_stats WHERE generation_id = ?").run(generationId);
    return false;
  }
  upsertStats.run(
    crypto.randomUUID(),
    generationId,
    stats.lastSalePrice,
    stats.lastSaleDate,
    stats.lastSaleSource,
    stats.avgPrice12mo,
    stats.high52wk,
    stats.low52wk,
    stats.salesCount12mo,
    stats.trendDirection,
    stats.trendPercentage
  );
  return true;
}

export function refreshAllGenerationStats(asOf = getDataAsOfDate()): { updated: number; cleared: number } {
  const ids = sqlite.prepare("SELECT id FROM generations").all() as { id: string }[];
  let updated = 0;
  let cleared = 0;
  const run = sqlite.transaction(() => {
    for (const { id } of ids) {
      if (refreshGenerationStats(id, asOf)) updated++;
      else cleared++;
    }
  });
  run();
  return { updated, cleared };
}

const upsertIndex = sqlite.prepare(`
  INSERT INTO category_indices (id, category, display_name, index_value, change_quarterly, model_count, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(category) DO UPDATE SET
    display_name = excluded.display_name,
    index_value = excluded.index_value,
    change_quarterly = excluded.change_quarterly,
    model_count = excluded.model_count,
    updated_at = datetime('now')
`);

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
export function refreshCategoryIndices(asOf = getDataAsOfDate()): number {
  const categories = (
    sqlite.prepare("SELECT DISTINCT category FROM generations ORDER BY category").all() as { category: string }[]
  ).map((r) => r.category);

  const run = sqlite.transaction(() => {
    for (const category of categories) {
      const gens = sqlite
        .prepare(
          `SELECT g.id, s.avg_price_12mo AS avg, s.trend_percentage AS trend
           FROM generations g
           JOIN generation_stats s ON s.generation_id = g.id
           WHERE g.category = ?`
        )
        .all(category) as { id: string; avg: number | null; trend: number | null }[];

      const avgs = gens.map((g) => g.avg ?? 0).filter((v) => v > 0);
      const indexValue = avgs.length ? Math.round(median(avgs) / 10000) : 0;

      const salesByGen = new Map<string, SaleLike[]>();
      for (const g of gens) salesByGen.set(g.id, soldSalesFor(g.id));
      let change = quarterlyChange(salesByGen, asOf);
      if (change === null) {
        const trends = gens.map((g) => g.trend ?? 0);
        change = trends.length
          ? Math.round((trends.reduce((a, b) => a + b, 0) / trends.length) * 10) / 10
          : 0;
      }

      upsertIndex.run(
        crypto.randomUUID(),
        category,
        categoryDisplayNames[category] ?? category,
        indexValue,
        change,
        gens.length
      );
    }
    // Drop indices for categories that no longer have generations
    if (categories.length) {
      const placeholders = categories.map(() => "?").join(",");
      sqlite.prepare(`DELETE FROM category_indices WHERE category NOT IN (${placeholders})`).run(...categories);
    }
  });
  run();
  return categories.length;
}

export interface RefreshSummary {
  asOf: string;
  generationsUpdated: number;
  generationsCleared: number;
  categories: number;
}

/** Recompute everything derived from the sales table. */
export function refreshAllStats(): RefreshSummary {
  const asOf = getDataAsOfDate();
  const { updated, cleared } = refreshAllGenerationStats(asOf);
  const categories = refreshCategoryIndices(asOf);
  return { asOf, generationsUpdated: updated, generationsCleared: cleared, categories };
}
