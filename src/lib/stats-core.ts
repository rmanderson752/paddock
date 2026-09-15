// Pure statistics helpers — no database access, safe to import from client
// components, server code and scripts alike.

export interface SaleLike {
  salePrice: number; // USD cents
  saleDate: string;  // YYYY-MM-DD
  source: string;
}

export type TrendDirection = "appreciating" | "stable" | "depreciating";

export interface ComputedStats {
  lastSalePrice: number;
  lastSaleDate: string;
  lastSaleSource: string;
  avgPrice12mo: number;
  high52wk: number;
  low52wk: number;
  salesCount12mo: number;
  trendDirection: TrendDirection;
  trendPercentage: number;
}

/** Shift an ISO date (YYYY-MM-DD) by whole years/months/days, returning ISO. */
export function shiftIsoDate(
  iso: string,
  { years = 0, months = 0, days = 0 }: { years?: number; months?: number; days?: number }
): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/** Trend direction from a percentage change, with a ±3% "stable" band. */
export function trendDirectionFor(pct: number): TrendDirection {
  if (pct > 3) return "appreciating";
  if (pct < -3) return "depreciating";
  return "stable";
}

/**
 * Compute the headline stats for one generation from its completed sales.
 *
 * Windows are relative to `asOf` (normally the most recent sale date in the
 * dataset) so a snapshot that is a few months old still reports sensible
 * 12-month figures. The trend compares the median of the newer half of the
 * 12-month sales against the older half — medians keep a single outlier
 * (a concours-grade or heavily modified example) from swinging the number.
 *
 * Returns null when there are no completed sales.
 */
export function computeStatsFromSales(sales: SaleLike[], asOf: string): ComputedStats | null {
  const sorted = [...sales].sort((a, b) => b.saleDate.localeCompare(a.saleDate));
  if (sorted.length === 0) return null;

  const windowStart = shiftIsoDate(asOf, { years: -1 });
  const recent = sorted.filter((s) => s.saleDate >= windowStart && s.saleDate <= asOf);
  const recentPrices = recent.map((s) => s.salePrice);

  const last = sorted[0];
  const avgPrice12mo = recentPrices.length ? mean(recentPrices) : last.salePrice;
  const high52wk = recentPrices.length ? Math.max(...recentPrices) : last.salePrice;
  const low52wk = recentPrices.length ? Math.min(...recentPrices) : last.salePrice;

  let trendPercentage = 0;
  if (recent.length >= 4) {
    const split = Math.ceil(recent.length / 2);
    const newer = median(recent.slice(0, split).map((s) => s.salePrice));
    const older = median(recent.slice(split).map((s) => s.salePrice));
    if (older > 0) trendPercentage = ((newer - older) / older) * 100;
  }
  trendPercentage = Math.round(trendPercentage * 10) / 10;

  return {
    lastSalePrice: last.salePrice,
    lastSaleDate: last.saleDate,
    lastSaleSource: last.source,
    avgPrice12mo,
    high52wk,
    low52wk,
    salesCount12mo: recent.length,
    trendDirection: trendDirectionFor(trendPercentage),
    trendPercentage,
  };
}

/**
 * Equal-weighted quarter-over-quarter change across several generations:
 * each generation contributes the change in its median sale price between
 * the two most recent 90-day windows, and only if it sold in both.
 */
export function quarterlyChange(
  salesByGeneration: Map<string, SaleLike[]>,
  asOf: string
): number | null {
  const q1Start = shiftIsoDate(asOf, { days: -90 });
  const q0Start = shiftIsoDate(asOf, { days: -180 });
  const changes: number[] = [];

  for (const sales of salesByGeneration.values()) {
    const q1 = sales.filter((s) => s.saleDate > q1Start && s.saleDate <= asOf).map((s) => s.salePrice);
    const q0 = sales.filter((s) => s.saleDate > q0Start && s.saleDate <= q1Start).map((s) => s.salePrice);
    if (q1.length === 0 || q0.length === 0) continue;
    const base = median(q0);
    if (base > 0) changes.push(((median(q1) - base) / base) * 100);
  }

  if (changes.length === 0) return null;
  return Math.round((changes.reduce((a, b) => a + b, 0) / changes.length) * 10) / 10;
}
