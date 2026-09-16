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

// A ticker rail: one column per index, serif figures, hairline separators.
export function MarketIndices({ indices, series = {} }: MarketIndicesProps) {
  const shown = indices.filter((idx) => idx.modelCount > 0);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 border-t border-l border-surface-border">
        {shown.map((idx) => {
          const points = series[idx.category] ?? [];
          return (
            <Link
              key={idx.category}
              href={`/browse/${idx.category}`}
              className="border-r border-b border-surface-border px-4 py-5 hover:bg-surface-hover transition-colors"
            >
              <div className="label-caps text-sand-subtle truncate">{idx.displayName}</div>
              <div className="display-serif numerals text-[30px] text-sand mt-2">
                {idx.indexValue.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <TrendIndicator value={idx.changeQuarterly} />
                <span className="text-[11px] text-sand-faint">≈ {formatPriceShort(idx.indexValue * 10000)}</span>
              </div>
              <div className="mt-4">
                {points.length > 1 ? (
                  <Sparkline
                    id={`index-${idx.category}`}
                    data={points}
                    trend={idx.changeQuarterly >= 0 ? "positive" : "negative"}
                    height={28}
                  />
                ) : (
                  <div className="h-7 flex items-center text-[10px] text-sand-faint">Not enough data</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-sand-faint">
        Index = median twelve-month average of the category&apos;s tracked models, in hundreds of dollars.
        Quarterly change is the equal-weighted change in each model&apos;s median sale price across the two most recent
        90-day windows.
      </p>
    </div>
  );
}
