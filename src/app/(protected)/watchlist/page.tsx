import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
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
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle
          eyebrow="Your collection"
          title="Watchlist"
          description={
            cars.length === 0
              ? "Cars you star appear here with their latest values."
              : `${cars.length} car${cars.length !== 1 ? "s" : ""} · twelve months of sales`
          }
        />
        <div className="pt-8">
          <WatchlistGrid cars={cars} isAuthenticated={true} sparklineData={sparklineData} />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
