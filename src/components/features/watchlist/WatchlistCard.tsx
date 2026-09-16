import Link from "next/link";
import { Sparkline } from "@/components/ui/Sparkline";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { WatchlistStar } from "./WatchlistStar";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface WatchlistCardProps {
  car: GenerationWithDetails;
  isAuthenticated: boolean;
  sparklineData?: number[];
}

export function WatchlistCard({ car, isAuthenticated, sparklineData = [] }: WatchlistCardProps) {
  const sparkData = sparklineData;
  const isPositive = car.stats.trendPercentage >= 0;

  return (
    <div className="group relative border-r border-b border-surface-border px-5 py-6 hover:bg-surface-hover transition-colors">
      <Link
        href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
        className="block"
      >
        <div className="pr-8">
          <div className="label-caps text-sand-subtle">{car.make.name}</div>
          <div className="display-serif text-[22px] text-sand mt-1 group-hover:underline decoration-[0.5px] underline-offset-4">
            {car.name}
          </div>
        </div>

        <div className="mt-5 h-9">
          {sparkData.length > 1 && (
            <Sparkline
              id={`watch-${car.id}`}
              data={sparkData}
              trend={isPositive ? "positive" : "negative"}
              height={36}
            />
          )}
        </div>

        <div className="flex justify-between items-baseline mt-4">
          <span className="display-serif numerals text-[20px] text-sand">
            {formatPrice(car.stats.avgPrice12mo)}
          </span>
          <TrendIndicator value={car.stats.trendPercentage} />
        </div>
      </Link>

      {/* Star positioned absolutely in top-right */}
      <div className="absolute top-6 right-5">
        <WatchlistStar
          generationId={car.id}
          initialWatched={true}
          isAuthenticated={isAuthenticated}
          size={14}
        />
      </div>
    </div>
  );
}
