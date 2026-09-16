"use client";

import { useState, useMemo } from "react";
import { PriceChart } from "./PriceChart";
import { StatsGrid } from "./StatsGrid";
import { RecentSalesFeed } from "./RecentSalesFeed";
import { ChartFilters, type FilterState } from "./ChartFilters";
import { computeStatsFromSales } from "@/lib/stats-core";
import type { Sale, ActiveListing, GenerationStats } from "@/lib/types";

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

    // Color filter
    if (filters.color !== "all" && s.color !== filters.color) return false;

    // Year filter
    if (filters.year !== "all" && s.year !== Number(filters.year)) return false;

    return true;
  });
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
    year: "all",
  });

  const isFiltered =
    filters.mileage !== "all" ||
    filters.color !== "all" ||
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

  // Extract unique colors and years for filter chips
  const availableColors = useMemo(() => {
    const colors = new Set<string>();
    allSales.forEach((s) => {
      if (s.color) colors.add(s.color);
    });
    return Array.from(colors).sort();
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
        availableYears={availableYears}
        totalSales={allSales.length}
        filteredSales={filteredSales.length}
      />

      <StatsGrid stats={filteredStats} recentSales={filteredSales} />
      <RecentSalesFeed sales={filteredSales} activeListings={activeListings} />
    </div>
  );
}
