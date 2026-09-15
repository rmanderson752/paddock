import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface TopMoversCompactProps {
  title: string;
  cars: GenerationWithDetails[];
}

export function TopMoversCompact({ title, cars }: TopMoversCompactProps) {
  return (
    <Card>
      <h3 className="text-[12px] uppercase tracking-[0.5px] text-sand-faint mb-2">
        {title}
      </h3>
      <div className="divide-y divide-surface-border -mx-4 sm:-mx-5">
        {cars.map((car, i) => (
          <Link
            key={car.id}
            href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
            className="flex items-center justify-between px-4 sm:px-5 py-2.5 hover:bg-surface-hover transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-[11px] text-sand-faint w-4 text-right shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-sand truncate">
                  {car.make.name} {car.name}
                </div>
                <div className="text-[11px] text-sand-subtle">
                  {formatPrice(car.stats.avgPrice12mo)}
                </div>
              </div>
            </div>
            <TrendIndicator value={car.stats.trendPercentage} />
          </Link>
        ))}
      </div>
    </Card>
  );
}
