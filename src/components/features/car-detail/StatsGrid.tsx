import { StatBlock } from "@/components/ui/StatBlock";
import { formatPrice, formatDate } from "@/lib/utils";
import { sourceLabels, sourceShortLabels, type GenerationStats, type Sale } from "@/lib/types";

interface StatsGridProps {
  stats: GenerationStats;
  recentSales: Sale[];
}

function findSaleByPrice(sales: Sale[], price: number): Sale | undefined {
  return sales.find((s) => s.salePrice === price);
}

export function StatsGrid({ stats, recentSales }: StatsGridProps) {
  const trendColor =
    stats.trendDirection === "appreciating"
      ? "text-forest-light"
      : stats.trendDirection === "depreciating"
        ? "text-maroon-light"
        : "text-sand";

  const trendLabel =
    stats.trendDirection.charAt(0).toUpperCase() + stats.trendDirection.slice(1);

  // Build contextual sub-text
  const lastSaleSubtext = stats.lastSaleDate
    ? `${sourceLabels[stats.lastSaleSource] ?? stats.lastSaleSource} · ${formatDate(stats.lastSaleDate)}`
    : undefined;

  const highSale = findSaleByPrice(recentSales, stats.high52wk);
  const highSubtext = highSale
    ? [highSale.color, highSale.mileage ? `${Math.round(highSale.mileage / 1000)}k mi` : null].filter(Boolean).join(" · ") || undefined
    : undefined;

  const lowSale = findSaleByPrice(recentSales, stats.low52wk);
  const lowSubtext = lowSale
    ? [lowSale.color, lowSale.mileage ? `${Math.round(lowSale.mileage / 1000)}k mi` : null].filter(Boolean).join(" · ") || undefined
    : undefined;

  // Unique sources from recent sales
  const sourceCounts = recentSales.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([src]) => sourceShortLabels[src] ?? sourceLabels[src] ?? src)
    .join(", ");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-8 py-8 border-b border-surface-border">
      <StatBlock
        label="Last sale"
        value={formatPrice(stats.lastSalePrice)}
        subtext={lastSaleSubtext}
      />
      <StatBlock
        label="52-week high"
        value={formatPrice(stats.high52wk)}
        subtext={highSubtext}
      />
      <StatBlock
        label="52-week low"
        value={formatPrice(stats.low52wk)}
        subtext={lowSubtext}
      />
      <StatBlock
        label="Twelve-month average"
        value={formatPrice(stats.avgPrice12mo)}
      />
      <StatBlock
        label="Sales, twelve months"
        value={String(stats.salesCount12mo)}
        subtext={topSources || undefined}
      />
      <StatBlock
        label="Trend"
        value={trendLabel}
        valueClassName={trendColor}
        subtext={
          stats.salesCount12mo >= 4
            ? `${stats.trendPercentage >= 0 ? "+" : ""}${stats.trendPercentage.toFixed(1)}% · newer vs older sales`
            : "Fewer than 4 sales — not enough for a trend"
        }
      />
    </div>
  );
}
