import { describe, it, expect } from "vitest";
import {
  getAllMakes,
  getAllMakesWithCounts,
  getGenerationWithDetails,
  searchGenerations,
  findGenerationBySlug,
  getTopMovers,
  getSalesForGeneration,
  getGenerationsByCategory,
  getGenerationsByPriceRange,
  getGenerationsByEra,
  getCategoryIndices,
  getCategoryMonthlySeries,
  getDataAsOfDate,
} from "./data";
import { priceRanges } from "./types";

describe("data layer", () => {
  it("getAllMakes returns non-empty sorted array", async () => {
    const makes = await getAllMakes();
    expect(makes.length).toBeGreaterThan(0);
    // Verify sorted by name
    for (let i = 1; i < makes.length; i++) {
      expect(makes[i].name >= makes[i - 1].name).toBe(true);
    }
  });

  it("getAllMakesWithCounts returns makes with positive counts", async () => {
    const makes = await getAllMakesWithCounts();
    expect(makes.length).toBeGreaterThan(0);
    for (const m of makes) {
      expect(m.generationCount).toBeGreaterThan(0);
    }
  });

  it("getGenerationWithDetails returns null for invalid id", async () => {
    expect(await getGenerationWithDetails("nonexistent")).toBeNull();
  });

  it("findGenerationBySlug returns null for unknown slugs", async () => {
    expect(await findGenerationBySlug("porsche", "911", "does-not-exist")).toBeNull();
  });

  it("findGenerationBySlug returns complete data for a known car", async () => {
    const car = await findGenerationBySlug("porsche", "911", "964-turbo-3-6");
    expect(car).not.toBeNull();
    expect(car!.make.name).toBe("Porsche");
    expect(car!.model.slug).toBe("911");
    expect(car!.stats.avgPrice12mo).toBeGreaterThan(0);
  });

  it("getSalesForGeneration only returns completed sales, oldest first", async () => {
    const car = (await findGenerationBySlug("porsche", "911", "993-turbo"))!;
    const sales = await getSalesForGeneration(car.id);
    expect(sales.length).toBeGreaterThan(0);
    for (const s of sales) expect(s.sold).toBe(true);
    for (let i = 1; i < sales.length; i++) {
      expect(sales[i].saleDate >= sales[i - 1].saleDate).toBe(true);
    }
    const oneYear = await getSalesForGeneration(car.id, "1y");
    expect(oneYear.length).toBeLessThanOrEqual(sales.length);
  });

  it("getDataAsOfDate is an ISO date no later than today", async () => {
    const asOf = await getDataAsOfDate();
    expect(asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(asOf <= new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it("searchGenerations finds results by make name", async () => {
    const results = await searchGenerations("porsche");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const searchable = `${r.make.name} ${r.model.name} ${r.name} ${r.chassisCode ?? ""}`.toLowerCase();
      expect(searchable).toContain("porsche");
    }
  });

  it("searchGenerations returns empty for short queries", async () => {
    expect(await searchGenerations("a")).toHaveLength(0);
    expect(await searchGenerations("")).toHaveLength(0);
  });

  it("getTopMovers returns limited results", async () => {
    const gainers = await getTopMovers("gainers", 5);
    expect(gainers.length).toBeLessThanOrEqual(5);
    expect(gainers.length).toBeGreaterThan(0);
  });

  it("getTopMovers gainers are sorted descending by trend", async () => {
    const gainers = await getTopMovers("gainers", 8);
    for (let i = 1; i < gainers.length; i++) {
      expect(gainers[i].stats.trendPercentage).toBeLessThanOrEqual(
        gainers[i - 1].stats.trendPercentage
      );
    }
  });

  it("getGenerationsByCategory returns only matching category", async () => {
    const jdm = await getGenerationsByCategory("jdm");
    for (const g of jdm) {
      expect(g.category).toBe("jdm");
    }
  });

  it("getGenerationsByPriceRange respects the range bounds", async () => {
    const range = priceRanges[1]; // $50k–$100k
    const cars = await getGenerationsByPriceRange(range.value);
    for (const c of cars) {
      expect(c.stats.avgPrice12mo).toBeGreaterThanOrEqual(range.min);
      expect(c.stats.avgPrice12mo).toBeLessThanOrEqual(range.max);
    }
  });

  it("getGenerationsByEra filters by first model year", async () => {
    const classic = await getGenerationsByEra("classic");
    for (const c of classic) expect(c.yearStart).toBeLessThanOrEqual(1984);
  });

  it("getCategoryIndices returns computed values", async () => {
    const indices = await getCategoryIndices();
    expect(indices.length).toBeGreaterThan(0);
    for (const idx of indices) {
      expect(idx.modelCount).toBeGreaterThan(0);
      expect(idx.indexValue).toBeGreaterThan(0);
    }
  });

  it("getCategoryMonthlySeries returns a series per category with data", async () => {
    const series = await getCategoryMonthlySeries();
    expect(Object.keys(series).length).toBeGreaterThan(0);
    for (const points of Object.values(series)) {
      expect(points.length).toBeGreaterThan(0);
      for (const p of points) expect(p).toBeGreaterThan(0);
    }
  });
});
