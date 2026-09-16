import Link from "next/link";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface TopMoversCompactProps {
  title: string;
  cars: GenerationWithDetails[];
}

export function TopMoversCompact({ title, cars }: TopMoversCompactProps) {
  return (
    <div>
      <h3 className="label-caps text-sand-subtle mb-2">{title}</h3>
      <ol className="divide-y divide-surface-border border-y border-surface-border">
        {cars.map((car, i) => (
          <li key={car.id}>
            <Link
              href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
              className="flex items-center gap-4 py-3.5 group"
            >
              <span className="label-caps text-brass numerals w-5">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="display-serif text-[17px] text-sand truncate group-hover:underline decoration-[0.5px] underline-offset-4">
                  {car.make.name} {car.name}
                </div>
                <div className="label-caps text-sand-faint mt-1 numerals">{formatPrice(car.stats.avgPrice12mo)}</div>
              </div>
              <TrendIndicator value={car.stats.trendPercentage} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
