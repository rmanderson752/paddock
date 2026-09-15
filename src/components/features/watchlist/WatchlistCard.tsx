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
    <div className="relative rounded-xl border-[0.5px] border-surface-border bg-surface p-3.5 hover:border-surface-border-hover transition-colors">
      <Link
        href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
        className="block"
      >
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="text-[11px] text-sand-subtle">{car.make.name}</div>
            <div className="text-[14px] font-medium text-sand">{car.name}</div>
          </div>
        </div>

        {sparkData.length > 1 && (
          <div className="mb-2">
            <Sparkline
              data={sparkData}
              trend={isPositive ? "positive" : "negative"}
              height={36}
            />
          </div>
        )}

        <div className="flex justify-between items-baseline">
          <span className="text-[15px] font-medium text-sand">
            {formatPrice(car.stats.avgPrice12mo)}
          </span>
          <TrendIndicator value={car.stats.trendPercentage} />
        </div>
      </Link>

      {/* Star positioned absolutely in top-right */}
      <div className="absolute top-3.5 right-3.5">
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
