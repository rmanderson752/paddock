import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import type { CategoryIndex } from "@/lib/types";

interface CategoryGridProps {
  indices: CategoryIndex[];
}

// Category tiles as an editorial index: numbered, serif names, hairlines.
export function CategoryGrid({ indices }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-surface-border">
      {indices.map((idx, i) => (
        <Link
          key={idx.category}
          href={`/browse/${idx.category}`}
          className="group border-r border-b border-surface-border px-5 py-6 hover:bg-surface-hover transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="label-caps text-brass">{String(i + 1).padStart(2, "0")}</span>
            <TrendIndicator value={idx.changeQuarterly} />
          </div>
          <div className="display-serif text-[24px] text-sand mt-6 group-hover:underline decoration-[0.5px] underline-offset-4">
            {idx.displayName}
          </div>
          <div className="label-caps text-sand-subtle mt-2">
            {idx.modelCount} model{idx.modelCount !== 1 ? "s" : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
