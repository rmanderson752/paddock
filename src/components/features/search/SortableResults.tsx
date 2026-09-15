"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { Sparkline } from "@/components/ui/Sparkline";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
      <Card>
        <p className="text-sm text-sand-muted">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-sand-subtle">
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-[12px] bg-surface border border-surface-border rounded-lg px-2 py-1.5 text-sand-muted outline-none cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-surface-border">
          {sorted.map((car) => {
            const sparkData = showSparklines
              ? (sparklineData[car.id] ?? [])
              : [];
            const isPositive = car.stats.trendPercentage >= 0;

            return (
              <Link
                key={car.id}
                href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
                className="flex items-center justify-between py-3 hover:bg-surface-hover -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-sand-subtle">
                      {car.make.name}
                    </span>
                    <Badge
                      variant={isPositive ? "positive" : "negative"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {categoryLabels[car.category] ?? car.category}
                    </Badge>
                  </div>
                  <div className="text-[14px] font-medium text-sand truncate">
                    {car.name}
                  </div>
                  <div className="text-[11px] text-sand-faint mt-0.5">
                    {car.yearStart}–{car.yearEnd ?? "present"}
                    {car.chassisCode && ` · ${car.chassisCode}`}
                    {car.stats.salesCount12mo > 0 &&
                      ` · ${car.stats.salesCount12mo} sales (12mo)`}
                  </div>
                </div>

                {showSparklines && sparkData.length > 2 && (
                  <div className="w-16 shrink-0 hidden sm:block">
                    <Sparkline
                      id={`result-${car.id}`}
                      data={sparkData}
                      trend={isPositive ? "positive" : "negative"}
                      height={24}
                    />
                  </div>
                )}

                <div className="text-right shrink-0">
                  <div className="text-[13px] font-medium text-sand">
                    {formatPrice(car.stats.avgPrice12mo)}
                  </div>
                  <TrendIndicator value={car.stats.trendPercentage} />
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
