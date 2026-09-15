import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface SearchResultsProps {
  results: GenerationWithDetails[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <Card>
        <p className="text-sm text-sand-muted">
          No results found for &ldquo;{query}&rdquo;
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-surface-border">
        {results.map((car) => (
          <Link
            key={car.id}
            href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
            className="flex items-center justify-between py-3 hover:bg-surface-hover -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors"
          >
            <div>
              <div className="text-[11px] text-sand-subtle">{car.make.name}</div>
              <div className="text-[14px] font-medium text-sand">{car.name}</div>
              <div className="text-[11px] text-sand-faint mt-0.5">
                {car.yearStart}–{car.yearEnd ?? "present"}
                {car.chassisCode && ` · ${car.chassisCode}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-medium text-sand">
                {formatPrice(car.stats.avgPrice12mo)}
              </div>
              <TrendIndicator value={car.stats.trendPercentage} />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
