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
    <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-l border-surface-border">
      {eraCards.map((era) => (
        <Link
          key={era.value}
          href={`/browse/era/${era.value}`}
          className="group border-r border-b border-surface-border px-5 py-6 hover:bg-surface-hover transition-colors"
        >
          <div className="display-serif text-[22px] text-sand group-hover:underline decoration-[0.5px] underline-offset-4">
            {era.label}
          </div>
          <div className="label-caps text-sand-subtle mt-2">
            {era.count} model{era.count !== 1 ? "s" : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
