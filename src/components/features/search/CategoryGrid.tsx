import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import type { CategoryIndex } from "@/lib/types";

interface CategoryGridProps {
  indices: CategoryIndex[];
}

export function CategoryGrid({ indices }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {indices.map((idx) => (
        <Link
          key={idx.category}
          href={`/browse/${idx.category}`}
          className="rounded-xl border-[0.5px] border-surface-border bg-surface p-3.5 hover:border-surface-border-hover transition-colors"
        >
          <div className="text-[13px] font-medium text-sand mb-0.5">
            {idx.displayName}
          </div>
          <div className="text-[11px] text-sand-subtle mb-1.5">
            {idx.modelCount} models
          </div>
          <TrendIndicator value={idx.changeQuarterly} />
        </Link>
      ))}
    </div>
  );
}
