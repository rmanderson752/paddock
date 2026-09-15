import Link from "next/link";
import type { MakeWithCount } from "@/lib/types";

interface MakeGridProps {
  makes: MakeWithCount[];
}

export function MakeGrid({ makes }: MakeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {makes.map(({ make, modelCount, generationCount }) => (
        <Link
          key={make.id}
          href={`/browse/make/${make.slug}`}
          className="rounded-xl border-[0.5px] border-surface-border bg-surface p-3.5 hover:border-surface-border-hover transition-colors"
        >
          <div className="text-[14px] font-medium text-sand mb-0.5">
            {make.name}
          </div>
          <div className="text-[11px] text-sand-subtle">
            {modelCount} model{modelCount !== 1 ? "s" : ""} &middot; {generationCount} variant{generationCount !== 1 ? "s" : ""}
          </div>
        </Link>
      ))}
    </div>
  );
}
