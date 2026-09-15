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
      <div className="rounded-xl border-[0.5px] border-surface-border bg-surface p-6 text-center">
        <p className="text-sm text-sand-muted">
          No cars in your watchlist yet.{" "}
          <Link href="/browse" className="text-forest-light hover:underline">Browse cars</Link>{" "}
          and tap the star to add them.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
