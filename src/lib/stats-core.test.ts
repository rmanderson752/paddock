import { describe, it, expect } from "vitest";
import {
  computeStatsFromSales,
  median,
  quarterlyChange,
  shiftIsoDate,
  trendDirectionFor,
} from "./stats-core";

const asOf = "2026-03-17";

function sale(saleDate: string, dollars: number, source = "bat") {
  return { saleDate, salePrice: dollars * 100, source };
}

describe("shiftIsoDate", () => {
  it("shifts by years, months and days without timezone drift", () => {
    expect(shiftIsoDate("2026-03-17", { years: -1 })).toBe("2025-03-17");
    expect(shiftIsoDate("2026-03-31", { months: -1 })).toBe("2026-03-03"); // JS month overflow, as Date does
    expect(shiftIsoDate("2026-01-01", { days: -1 })).toBe("2025-12-31");
    expect(shiftIsoDate("2026-03-17", { days: -90 })).toBe("2025-12-17");
  });
});

describe("median", () => {
  it("handles odd, even and empty inputs", () => {
    expect(median([])).toBe(0);
    expect(median([5])).toBe(5);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3); // rounded mean of the middle pair
  });
});

describe("trendDirectionFor", () => {
  it("uses a ±3% stable band", () => {
    expect(trendDirectionFor(3.1)).toBe("appreciating");
    expect(trendDirectionFor(3)).toBe("stable");
    expect(trendDirectionFor(-3)).toBe("stable");
    expect(trendDirectionFor(-3.1)).toBe("depreciating");
  });
});

describe("computeStatsFromSales", () => {
  it("returns null with no sales", () => {
    expect(computeStatsFromSales([], asOf)).toBeNull();
  });

  it("computes the 12-month window relative to asOf", () => {
    const stats = computeStatsFromSales(
      [
        sale("2024-06-01", 100_000), // outside the window
        sale("2025-06-01", 120_000),
        sale("2026-01-15", 140_000, "mecum"),
      ],
      asOf
    )!;
    expect(stats.salesCount12mo).toBe(2);
    expect(stats.avgPrice12mo).toBe(130_000 * 100);
    expect(stats.high52wk).toBe(140_000 * 100);
    expect(stats.low52wk).toBe(120_000 * 100);
    expect(stats.lastSalePrice).toBe(140_000 * 100);
    expect(stats.lastSaleDate).toBe("2026-01-15");
    expect(stats.lastSaleSource).toBe("mecum");
  });

  it("falls back to the last sale when nothing sold in the window", () => {
    const stats = computeStatsFromSales([sale("2023-01-01", 50_000)], asOf)!;
    expect(stats.salesCount12mo).toBe(0);
    expect(stats.avgPrice12mo).toBe(50_000 * 100);
    expect(stats.trendDirection).toBe("stable");
    expect(stats.trendPercentage).toBe(0);
  });

  it("needs at least four sales in the window before reporting a trend", () => {
    const three = computeStatsFromSales(
      [sale("2025-06-01", 100_000), sale("2025-10-01", 150_000), sale("2026-02-01", 200_000)],
      asOf
    )!;
    expect(three.trendPercentage).toBe(0);
    expect(three.trendDirection).toBe("stable");
  });

  it("compares medians of the newer and older halves", () => {
    const stats = computeStatsFromSales(
      [
        sale("2025-05-01", 100_000),
        sale("2025-07-01", 100_000),
        sale("2025-12-01", 120_000),
        sale("2026-02-01", 130_000),
      ],
      asOf
    )!;
    // newer half median 125k vs older half median 100k → +25%
    expect(stats.trendPercentage).toBe(25);
    expect(stats.trendDirection).toBe("appreciating");
  });

  it("is not thrown off by a single outlier", () => {
    const stats = computeStatsFromSales(
      [
        sale("2025-05-01", 100_000),
        sale("2025-06-01", 102_000),
        sale("2025-07-01", 98_000),
        sale("2026-01-01", 101_000),
        sale("2026-02-01", 99_000),
        sale("2026-03-01", 950_000), // concours-grade example
      ],
      asOf
    )!;
    expect(Math.abs(stats.trendPercentage)).toBeLessThan(5);
    expect(stats.trendDirection).toBe("stable");
    expect(stats.high52wk).toBe(950_000 * 100);
  });
});

describe("quarterlyChange", () => {
  it("returns null when no generation sold in both windows", () => {
    const m = new Map([["a", [sale("2026-03-01", 100_000)]]]);
    expect(quarterlyChange(m, asOf)).toBeNull();
  });

  it("averages per-generation median changes equally", () => {
    const m = new Map([
      // +10%
      ["a", [sale("2025-11-01", 100_000), sale("2026-02-01", 110_000)]],
      // -10%
      ["b", [sale("2025-11-15", 500_000), sale("2026-03-01", 450_000)]],
      // only one window → ignored
      ["c", [sale("2026-03-10", 1_000_000)]],
    ]);
    expect(quarterlyChange(m, asOf)).toBe(0);
  });
});
