import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { WatchlistStar } from "@/components/features/watchlist/WatchlistStar";
import { AlertButton } from "@/components/features/alerts/AlertButton";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface CarHeaderProps {
  car: GenerationWithDetails;
  isWatched: boolean;
  isAuthenticated: boolean;
}

export function CarHeader({ car, isWatched, isAuthenticated }: CarHeaderProps) {
  const { stats } = car;
  const isPositive = stats.trendPercentage >= 0;
  const path = `/car/${car.make.slug}/${car.model.slug}/${car.slug}`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <div className="text-[12px] text-sand-subtle mb-0.5">{car.make.name}</div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-serif text-[22px] text-sand">{car.name}</h1>
          <WatchlistStar
            generationId={car.id}
            initialWatched={isWatched}
            isAuthenticated={isAuthenticated}
            size={18}
            className="mt-0.5"
          />
        </div>
        <div className="text-[12px] text-sand-subtle mt-0.5">
          {car.yearStart}–{car.yearEnd ?? "present"}
          {car.chassisCode && ` · ${car.chassisCode}`}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <AlertButton
            generationId={car.id}
            carName={`${car.make.name} ${car.name}`}
            referencePrice={stats.avgPrice12mo}
            isAuthenticated={isAuthenticated}
            returnPath={path}
          />
          <Link
            href={`/compare?ids=${car.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-surface-border px-3 py-1 text-[11px] font-medium text-sand-subtle hover:border-surface-border-hover hover:text-sand transition-colors"
          >
            <GitCompareArrows size={12} />
            Compare
          </Link>
        </div>
      </div>
      <div className="sm:text-right">
        <div className="text-[28px] font-serif text-sand">
          {formatPrice(stats.avgPrice12mo)}
        </div>
        <Badge variant={isPositive ? "positive" : "negative"}>
          {isPositive ? "▲" : "▼"} {Math.abs(stats.trendPercentage).toFixed(1)}% · 12-mo trend
        </Badge>
      </div>
    </div>
  );
}
