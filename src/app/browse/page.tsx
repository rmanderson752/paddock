import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { CategoryGrid } from "@/components/features/search/CategoryGrid";
import { MakeGrid } from "@/components/features/browse/MakeGrid";
import { PriceRangeGrid } from "@/components/features/browse/PriceRangeGrid";
import { EraGrid } from "@/components/features/browse/EraGrid";
import { TopMoversCompact } from "@/components/features/browse/TopMoversCompact";
import {
  getCategoryIndices,
  getAllMakesWithCounts,
  getTopMovers,
} from "@/lib/data";

export default function BrowsePage() {
  const categoryIndices = getCategoryIndices();
  const makesWithCounts = getAllMakesWithCounts();
  const gainers = getTopMovers("gainers", 5);
  const losers = getTopMovers("losers", 5);

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <h1 className="font-serif text-2xl mb-1">Browse</h1>
        <p className="text-sm text-sand-muted mb-8">
          Explore collector cars by category, make, price, or era.
        </p>

        {/* By Category */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-sand mb-3">By Category</h2>
          <CategoryGrid indices={categoryIndices} />
        </section>

        {/* By Make */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-sand mb-3">By Make</h2>
          <MakeGrid makes={makesWithCounts} />
        </section>

        {/* By Price Range */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-sand mb-3">By Price Range</h2>
          <PriceRangeGrid />
        </section>

        {/* By Era */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-sand mb-3">By Era</h2>
          <EraGrid />
        </section>

        {/* Trending */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-sand mb-3">Trending</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopMoversCompact title="Top Gainers" cars={gainers} />
            <TopMoversCompact title="Top Losers" cars={losers} />
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
