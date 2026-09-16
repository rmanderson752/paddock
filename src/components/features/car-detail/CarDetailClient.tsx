"use client";

import { useState, useMemo } from "react";
import { PriceChart } from "./PriceChart";
import { StatsGrid } from "./StatsGrid";
import { RecentSalesFeed } from "./RecentSalesFeed";
import { ChartFilters, type FilterState } from "./ChartFilters";
import { computeStatsFromSales } from "@/lib/stats-core";
import { colorFamilyLabels, type Sale, type ActiveListing, type GenerationStats } from "@/lib/types";

interface CarDetailClientProps {
  generationId: string;
  stats: GenerationStats;
  allSales: Sale[];
  activeListings: ActiveListing[];
  asOf: string;
}

function filterSales(sales: Sale[], filters: FilterState): Sale[] {
  return sales.filter((s) => {
    // Mileage filter
    if (filters.mileage !== "all" && s.mileage) {
      if (filters.mileage === "under30k" && s.mileage >= 30000) return false;
      if (filters.mileage === "30k-60k" && (s.mileage < 30000 || s.mileage >= 60000)) return false;
      if (filters.mileage === "60k+" && s.mileage < 60000) return false;
    }

    // Colour filter — by extracted family when the sale has one, else the raw name
    if (filters.color !== "all" && colorKey(s) !== filters.color) return false;

    // Gearbox filter (only sales with extracted details can match)
    if (filters.transmission !== "all" && s.details?.transmission !== filters.transmission) return false;

    // Year filter
    if (filters.year !== "all" && s.year !== Number(filters.year)) return false;

    return true;
  });
}

/** The value a sale contributes to the colour chips: its family, or its raw colour name. */
function colorKey(s: Sale): string | null {
  return s.details?.colorFamily ?? s.color ?? null;
}

export function CarDetailClient({
  generationId,
  stats,
  allSales,
  activeListings,
  asOf,
}: CarDetailClientProps) {
  const [filters, setFilters] = useState<FilterState>({
    mileage: "all",
    color: "all",
    transmission: "all",
    year: "all",
  });

  const isFiltered =
    filters.mileage !== "all" ||
    filters.color !== "all" ||
    filters.transmission !== "all" ||
    filters.year !== "all";

  const filteredSales = useMemo(
    () => filterSales(allSales, filters),
    [allSales, filters]
  );

  // Stats for the filtered subset use the same math as the precomputed ones
  const filteredStats = useMemo<GenerationStats>(() => {
    if (!isFiltered) return stats;
    const computed = computeStatsFromSales(filteredSales, asOf);
    return computed ? { generationId, ...computed } : stats;
  }, [generationId, filteredSales, stats, isFiltered, asOf]);

  // Colour chips: families (most common first) once details exist, raw names otherwise
  const availableColors = useMemo(() => {
    const counts = new Map<string, number>();
    allSales.forEach((s) => {
      const key = colorKey(s);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: colorFamilyLabels[value] ?? value, count }));
  }, [allSales]);

  const availableTransmissions = useMemo(() => {
    const present = new Set<"manual" | "automatic">();
    allSales.forEach((s) => {
      if (s.details?.transmission) present.add(s.details.transmission);
    });
    return Array.from(present).sort();
  }, [allSales]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allSales.forEach((s) => {
      if (s.year) years.add(s.year);
    });
    return Array.from(years).sort();
  }, [allSales]);

  return (
    <div>
      <PriceChart
        stats={filteredStats}
        allSales={allSales}
        activeListings={activeListings}
        filteredSales={isFiltered ? filteredSales : undefined}
        asOf={asOf}
      />

      <ChartFilters
        filters={filters}
        onChange={setFilters}
        availableColors={availableColors}
        availableTransmissions={availableTransmissions}
        availableYears={availableYears}
        totalSales={allSales.length}
        filteredSales={filteredSales.length}
      />

      <StatsGrid stats={filteredStats} recentSales={filteredSales} />
      <RecentSalesFeed sales={filteredSales} activeListings={activeListings} />
    </div>
  );
}
