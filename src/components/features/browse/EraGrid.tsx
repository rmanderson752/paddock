import Link from "next/link";
import { eras } from "@/lib/types";
import type { GenerationWithDetails } from "@/lib/types";

interface EraGridProps {
  generations: GenerationWithDetails[];
}

export function EraGrid({ generations: all }: EraGridProps) {

  const eraCards = eras.map((era) => {
    const count = all.filter(
      (g) => g.yearStart >= era.yearMin && g.yearStart <= era.yearMax
    ).length;
    return { ...era, count };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {eraCards.map((era) => (
        <Link
          key={era.value}
          href={`/browse/era/${era.value}`}
          className="rounded-xl border-[0.5px] border-surface-border bg-surface p-3.5 hover:border-surface-border-hover transition-colors"
        >
          <div className="text-[14px] font-medium text-sand mb-0.5">
            {era.label}
          </div>
          <div className="text-[11px] text-sand-subtle">
            {era.count} model{era.count !== 1 ? "s" : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
