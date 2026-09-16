import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { CategoryGrid } from "@/components/features/search/CategoryGrid";
import { MakeGrid } from "@/components/features/browse/MakeGrid";
import { PriceRangeGrid } from "@/components/features/browse/PriceRangeGrid";
import { EraGrid } from "@/components/features/browse/EraGrid";
import { TopMoversCompact } from "@/components/features/browse/TopMoversCompact";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  getCategoryIndices,
  getAllMakesWithCounts,
  getTopMovers,
  getAllGenerationsWithDetails,
} from "@/lib/data";

export default async function BrowsePage() {
  const [categoryIndices, makesWithCounts, gainers, losers, allGenerations] = await Promise.all([
    getCategoryIndices(),
    getAllMakesWithCounts(),
    getTopMovers("gainers", 5),
    getTopMovers("losers", 5),
    getAllGenerationsWithDetails(),
  ]);

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <div className="pt-12 pb-10 border-b border-surface-border">
          <p className="label-caps text-brass mb-4">The market</p>
          <h1 className="display-serif text-[40px] sm:text-[52px] text-sand">Browse</h1>
          <p className="mt-4 text-[15px] text-sand-muted max-w-xl">
            Every tracked car by category, marque, price and era.
          </p>
        </div>

        <section className="pt-14">
          <SectionTitle>By category</SectionTitle>
          <CategoryGrid indices={categoryIndices} />
        </section>

        <section className="pt-16">
          <SectionTitle>By marque</SectionTitle>
          <MakeGrid makes={makesWithCounts} />
        </section>

        <section className="pt-16">
          <SectionTitle aside="Twelve-month average">By price</SectionTitle>
          <PriceRangeGrid generations={allGenerations} />
        </section>

        <section className="pt-16">
          <SectionTitle aside="First model year">By era</SectionTitle>
          <EraGrid generations={allGenerations} />
        </section>

        <section className="pt-16">
          <SectionTitle aside="Twelve-month trend">Movers</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-14 gap-y-10">
            <TopMoversCompact title="Gaining" cars={gainers} />
            <TopMoversCompact title="Softening" cars={losers} />
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
