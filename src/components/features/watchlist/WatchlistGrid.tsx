import Link from "next/link";
import { WatchlistCard } from "./WatchlistCard";
import type { GenerationWithDetails } from "@/lib/types";

interface WatchlistGridProps {
  cars: GenerationWithDetails[];
  isAuthenticated: boolean;
  sparklineData?: Record<string, number[]>;
}

export function WatchlistGrid({ cars, isAuthenticated, sparklineData = {} }: WatchlistGridProps) {
  if (cars.length === 0) {
    return (
      <div className="border-y border-surface-border py-12 text-center">
        <p className="display-serif text-[20px] italic text-sand-muted">
          Nothing on the watchlist yet.
        </p>
        <p className="mt-3 text-[13px] text-sand-subtle">
          <Link href="/browse" className="text-forest hover:underline underline-offset-4">Browse the market</Link> and tap the star on any car.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-surface-border">
      {cars.map((car) => (
        <WatchlistCard
          key={car.id}
          car={car}
          isAuthenticated={isAuthenticated}
          sparklineData={sparklineData[car.id] ?? []}
        />
      ))}
    </div>
  );
}
