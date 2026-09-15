import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { WatchlistGrid } from "@/components/features/watchlist/WatchlistGrid";
import type { Metadata } from "next";
import { getGenerationsWithDetailsByIds, getSparklineDataForGenerations } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { getUserWatchlistIds } from "@/lib/auth/watchlist-actions";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Watchlist | Paddock" };

export default async function WatchlistPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/watchlist");

  const watchedIds = await getUserWatchlistIds();

  const cars = await getGenerationsWithDetailsByIds(watchedIds);
  const sparklineData = await getSparklineDataForGenerations(cars.map((c) => c.id));

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <h1 className="font-serif text-2xl mb-1">Watchlist</h1>
        <p className="text-sm text-sand-muted mb-6">
          {cars.length === 0
            ? "Cars you star show up here with their latest values."
            : `${cars.length} car${cars.length !== 1 ? "s" : ""} · last 12 months of sales`}
        </p>
        <WatchlistGrid cars={cars} isAuthenticated={true} sparklineData={sparklineData} />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
