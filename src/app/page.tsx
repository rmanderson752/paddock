import { HeaderServer } from "@/components/layout/HeaderServer";
import { LogoMark } from "@/components/ui/Logo";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { TopMovers } from "@/components/features/dashboard/TopMovers";
import { RecentlySold } from "@/components/features/dashboard/RecentlySold";
import { MarketIndices } from "@/components/features/dashboard/MarketIndices";
import { CategoryGrid } from "@/components/features/search/CategoryGrid";
import { SearchDropdown } from "@/components/features/search/SearchDropdown";
import {
  getTopMovers,
  getRecentSales,
  getCategoryIndices,
  getCategoryMonthlySeries,
  getDataAsOfDate,
} from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function HomePage() {
  const [gainers, losers, recentSales, categoryIndices, categorySeries, asOf] = await Promise.all([
    getTopMovers("gainers", 6),
    getTopMovers("losers", 6),
    getRecentSales(10),
    getCategoryIndices(),
    getCategoryMonthlySeries(),
    getDataAsOfDate(),
  ]);

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:pb-6">
        {/* Hero */}
        <section className="flex flex-col items-center text-center py-12 sm:py-16">
          <LogoMark size={40} className="mb-4" />
          <h1 className="font-serif text-3xl sm:text-4xl text-sand mb-2">Paddock</h1>
          <p className="text-sand-muted text-sm sm:text-base mb-1">
            Track the value of collector cars.
          </p>
          <p className="text-[11px] text-sand-faint mb-6">
            Real auction results · data through {formatDate(asOf)}
          </p>
          <div className="w-full max-w-md">
            <SearchDropdown />
          </div>
        </section>

        {/* Browse by Category */}
        <section className="mb-10">
          <h2 className="text-sm font-medium text-sand mb-3">Browse by Category</h2>
          <CategoryGrid indices={categoryIndices} />
        </section>

        {/* Top Movers + Recently Sold */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <section>
            <h2 className="text-sm font-medium text-sand mb-3">Top Movers</h2>
            <TopMovers gainers={gainers} losers={losers} />
          </section>

          <section>
            <h2 className="text-sm font-medium text-sand mb-3">Recently Sold</h2>
            <RecentlySold sales={recentSales} />
          </section>
        </div>

        {/* Market Indices */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-sand mb-3">Market Indices</h2>
          <MarketIndices indices={categoryIndices} series={categorySeries} />
        </section>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
