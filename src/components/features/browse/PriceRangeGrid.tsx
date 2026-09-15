import Link from "next/link";
import { priceRanges } from "@/lib/types";
import type { GenerationWithDetails } from "@/lib/types";

interface PriceRangeGridProps {
  generations: GenerationWithDetails[];
}

export function PriceRangeGrid({ generations: all }: PriceRangeGridProps) {

  const ranges = priceRanges.map((pr) => {
    const count = all.filter(
      (g) => g.stats.avgPrice12mo >= pr.min && g.stats.avgPrice12mo < pr.max
    ).length;
    return { ...pr, count };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ranges.map((pr) => (
        <Link
          key={pr.value}
          href={`/browse/price/${pr.value}`}
          className="rounded-xl border-[0.5px] border-surface-border bg-surface p-3.5 hover:border-surface-border-hover transition-colors"
        >
          <div className="text-[14px] font-medium text-gold mb-0.5">
            {pr.label}
          </div>
          <div className="text-[11px] text-sand-subtle">
            {pr.count} model{pr.count !== 1 ? "s" : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
