import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { WatchlistStar } from "@/components/features/watchlist/WatchlistStar";
import { AlertButton } from "@/components/features/alerts/AlertButton";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface CarHeaderProps {
  car: GenerationWithDetails;
  isWatched: boolean;
  isAuthenticated: boolean;
}

// The product page header: marque in tracked capitals, the model in a large
// Didone, the twelve-month value set like a price on a boutique shelf.
export function CarHeader({ car, isWatched, isAuthenticated }: CarHeaderProps) {
  const { stats } = car;
  const path = `/car/${car.make.slug}/${car.model.slug}/${car.slug}`;

  return (
    <div className="pt-10 pb-8 border-b border-surface-border">
      <nav className="label-caps text-sand-faint mb-8 flex items-center gap-2">
        <Link href="/browse" className="hover:text-sand transition-colors">Browse</Link>
        <span>/</span>
        <Link href={`/browse/make/${car.make.slug}`} className="hover:text-sand transition-colors">
          {car.make.name}
        </Link>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div className="min-w-0">
          <div className="label-caps text-brass mb-4">{car.make.name} · {car.model.name}</div>
          <div className="flex items-start gap-4">
            <h1 className="display-serif text-[40px] sm:text-[56px] text-sand">{car.name}</h1>
            <WatchlistStar
              generationId={car.id}
              initialWatched={isWatched}
              isAuthenticated={isAuthenticated}
              size={20}
              className="mt-3 sm:mt-5"
            />
          </div>
          <div className="label-caps text-sand-subtle mt-4">
            {car.yearStart}–{car.yearEnd ?? "present"}
            {car.chassisCode && <span className="ml-3 pl-3 border-l border-surface-border">{car.chassisCode}</span>}
          </div>
        </div>

        <div className="md:text-right shrink-0">
          <div className="label-caps text-sand-subtle mb-2">Twelve-month average</div>
          <div className="display-serif numerals text-[40px] sm:text-[48px] text-sand leading-none">
            {formatPrice(stats.avgPrice12mo)}
          </div>
          <div className="mt-3 flex md:justify-end items-center gap-2">
            <TrendIndicator value={stats.trendPercentage} className="text-[12px]" />
            <span className="label-caps text-sand-faint">trend</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
        <AlertButton
          generationId={car.id}
          carName={`${car.make.name} ${car.name}`}
          referencePrice={stats.avgPrice12mo}
          isAuthenticated={isAuthenticated}
          returnPath={path}
        />
        <Link
          href={`/compare?ids=${car.id}`}
          className="inline-flex items-center gap-2 label-caps text-sand-subtle hover:text-sand transition-colors"
        >
          <GitCompareArrows size={13} strokeWidth={1.5} />
          Compare
        </Link>
      </div>
    </div>
  );
}
