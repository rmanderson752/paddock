"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

type SortKey = "relevance" | "price_high" | "price_low" | "gainer" | "loser" | "volume";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price_high", label: "Price: High → Low" },
  { value: "price_low", label: "Price: Low → High" },
  { value: "gainer", label: "Biggest Gainer" },
  { value: "loser", label: "Biggest Loser" },
  { value: "volume", label: "Most Sales" },
];

function sortResults(results: GenerationWithDetails[], sort: SortKey): GenerationWithDetails[] {
  const sorted = [...results];
  switch (sort) {
    case "price_high":
      return sorted.sort((a, b) => b.stats.avgPrice12mo - a.stats.avgPrice12mo);
    case "price_low":
      return sorted.sort((a, b) => a.stats.avgPrice12mo - b.stats.avgPrice12mo);
    case "gainer":
      return sorted.sort((a, b) => b.stats.trendPercentage - a.stats.trendPercentage);
    case "loser":
      return sorted.sort((a, b) => a.stats.trendPercentage - b.stats.trendPercentage);
    case "volume":
      return sorted.sort((a, b) => b.stats.salesCount12mo - a.stats.salesCount12mo);
    default:
      return sorted;
  }
}

const categoryLabels: Record<string, string> = {
  jdm: "JDM",
  supercar: "Supercar",
  retro: "Air-Cooled",
  truck_suv: "Truck/SUV",
  modern_luxury: "Modern Luxury",
  modern_collectible: "Modern",
};

interface SortableResultsProps {
  results: GenerationWithDetails[];
  emptyMessage?: string;
  showSparklines?: boolean;
  sparklineData?: Record<string, number[]>; // generationId → price points
}

export function SortableResults({
  results,
  emptyMessage = "No results found.",
  showSparklines = false,
  sparklineData = {},
}: SortableResultsProps) {
  const [sort, setSort] = useState<SortKey>("relevance");

  const sorted = useMemo(() => sortResults(results, sort), [results, sort]);

  if (results.length === 0) {
    return (
      <div className="border-y border-surface-border py-10 text-center">
        <p className="display-serif text-[18px] text-sand-muted italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps text-sand-subtle">
          {results.length} model{results.length !== 1 ? "s" : ""}
        </span>
        <label className="flex items-center gap-2 label-caps text-sand-subtle">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="label-caps bg-transparent border-b border-surface-border py-1 pr-1 text-sand outline-none cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="border-t border-surface-border">
        {sorted.map((car, i) => {
          const sparkData = showSparklines ? (sparklineData[car.id] ?? []) : [];
          const isPositive = car.stats.trendPercentage >= 0;

          return (
            <li key={car.id} className="border-b border-surface-border">
              <Link
                href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
                className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-x-5 sm:gap-x-8 py-5 group"
              >
                <span className="label-caps text-brass numerals w-6">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="label-caps text-sand-subtle">
                    {car.make.name}
                    <span className="text-sand-faint"> · {categoryLabels[car.category] ?? car.category}</span>
                  </div>
                  <div className="display-serif text-[22px] text-sand truncate mt-1 group-hover:underline decoration-[0.5px] underline-offset-4">
                    {car.name}
                  </div>
                  <div className="text-[11px] text-sand-faint mt-1.5">
                    {car.yearStart}–{car.yearEnd ?? "present"}
                    {car.chassisCode && ` · ${car.chassisCode}`}
                    {car.stats.salesCount12mo > 0 && ` · ${car.stats.salesCount12mo} sales in twelve months`}
                  </div>
                </div>

                {showSparklines && (
                  <div className="w-24 shrink-0 hidden sm:block">
                    {sparkData.length > 2 && (
                      <Sparkline
                        id={`result-${car.id}`}
                        data={sparkData}
                        trend={isPositive ? "positive" : "negative"}
                        height={28}
                      />
                    )}
                  </div>
                )}

                <div className="text-right shrink-0">
                  <div className="display-serif numerals text-[20px] text-sand">
                    {formatPrice(car.stats.avgPrice12mo)}
                  </div>
                  <TrendIndicator value={car.stats.trendPercentage} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
