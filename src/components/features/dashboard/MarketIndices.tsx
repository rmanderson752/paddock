import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatPriceShort } from "@/lib/utils";
import type { CategoryIndex } from "@/lib/types";

interface MarketIndicesProps {
  indices: CategoryIndex[];
  /** Relative monthly price level per category (see getCategoryMonthlySeries) */
  series?: Record<string, number[]>;
}

export function MarketIndices({ indices, series = {} }: MarketIndicesProps) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {indices
          .filter((idx) => idx.modelCount > 0)
          .map((idx) => {
            const points = series[idx.category] ?? [];
            return (
              <Link
                key={idx.category}
                href={`/browse/${idx.category}`}
                className="rounded-xl border-[0.5px] border-surface-border bg-surface p-4 hover:border-surface-border-hover transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-sand mb-0.5">
                      {idx.displayName}
                    </div>
                    <div className="text-xl font-medium text-sand mb-0.5">
                      {idx.indexValue.toLocaleString()}
                    </div>
                    <TrendIndicator value={idx.changeQuarterly} className="text-[12px]" />
                    <span className="text-[11px] text-sand-faint ml-1.5">qtr</span>
                  </div>
                  <div className="text-right text-[11px] text-sand-subtle">
                    <div>{idx.modelCount} model{idx.modelCount !== 1 ? "s" : ""}</div>
                    <div>typical {formatPriceShort(idx.indexValue * 10000)}</div>
                  </div>
                </div>
                <div className="mt-2">
                  {points.length > 1 ? (
                    <Sparkline
                      data={points}
                      trend={idx.changeQuarterly >= 0 ? "positive" : "negative"}
                      height={32}
                    />
                  ) : (
                    <div className="h-8 flex items-center text-[10px] text-sand-faint">
                      Not enough monthly data yet
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
      </div>
      <p className="mt-3 text-[11px] text-sand-faint leading-relaxed">
        Index = median 12-month average price of the category&apos;s tracked models, in hundreds of
        dollars. Quarterly change is the equal-weighted change in each model&apos;s median sale price
        across the two most recent 90-day windows. Sparklines show relative monthly price level.
      </p>
    </div>
  );
}
