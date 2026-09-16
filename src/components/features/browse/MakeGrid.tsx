import Link from "next/link";
import type { MakeWithCount } from "@/lib/types";

interface MakeGridProps {
  makes: MakeWithCount[];
}

export function MakeGrid({ makes }: MakeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-l border-surface-border">
      {makes.map(({ make, modelCount, generationCount }) => (
        <Link
          key={make.id}
          href={`/browse/make/${make.slug}`}
          className="group border-r border-b border-surface-border px-4 py-5 hover:bg-surface-hover transition-colors"
        >
          <div className="display-serif text-[20px] text-sand group-hover:underline decoration-[0.5px] underline-offset-4">
            {make.name}
          </div>
          <div className="label-caps text-sand-subtle mt-2">
            {generationCount} model{generationCount !== 1 ? "s" : ""}
            {modelCount !== generationCount && ` · ${modelCount} line${modelCount !== 1 ? "s" : ""}`}
          </div>
        </Link>
      ))}
    </div>
  );
}
