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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-l border-surface-border">
      {ranges.map((pr) => (
        <Link
          key={pr.value}
          href={`/browse/price/${pr.value}`}
          className="group border-r border-b border-surface-border px-4 py-5 hover:bg-surface-hover transition-colors"
        >
          <div className="display-serif numerals text-[20px] text-sand group-hover:underline decoration-[0.5px] underline-offset-4">
            {pr.label}
          </div>
          <div className="label-caps text-sand-subtle mt-2">
            {pr.count} model{pr.count !== 1 ? "s" : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
