import Link from "next/link";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { TopMovers } from "@/components/features/dashboard/TopMovers";
import { RecentlySold } from "@/components/features/dashboard/RecentlySold";
import { MarketIndices } from "@/components/features/dashboard/MarketIndices";
import { CategoryGrid } from "@/components/features/search/CategoryGrid";
import { SearchDropdown } from "@/components/features/search/SearchDropdown";
import { SectionTitle } from "@/components/ui/SectionTitle";
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
    getRecentSales(8),
    getCategoryIndices(),
    getCategoryMonthlySeries(),
    getDataAsOfDate(),
  ]);

  const tracked = categoryIndices.reduce((n, c) => n + c.modelCount, 0);

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        {/* Hero — an editorial opening, not a dashboard header */}
        <section className="pt-16 pb-14 sm:pt-24 sm:pb-20 border-b border-surface-border">
          <p className="label-caps text-brass mb-6">The collector-car ledger</p>
          <h1 className="display-serif text-[40px] sm:text-[60px] text-sand max-w-4xl">
            From the poster on your wall to the keys in your hand.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] sm:text-[16px] leading-relaxed text-sand-muted">
            Follow the cars you&apos;ve always wanted, know what they&apos;re really worth, and watch
            the ones you own like a portfolio — {tracked} collector cars, priced by real auction results.
          </p>
          <div className="mt-10 max-w-md md:hidden">
            <SearchDropdown />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link
              href="/browse"
              className="label-caps rounded-[3px] bg-forest px-6 py-3 text-cream hover:bg-forest-dark transition-colors"
            >
              Browse the market
            </Link>
            <span className="label-caps text-sand-faint">Sale data through {formatDate(asOf)}</span>
          </div>
        </section>

        {/* Indices */}
        <section className="pt-14">
          <SectionTitle aside="Median tracked value by category · quarterly change">Market indices</SectionTitle>
          <MarketIndices indices={categoryIndices} series={categorySeries} />
        </section>

        {/* Categories */}
        <section className="pt-16">
          <SectionTitle aside={<Link href="/browse" className="hover:text-sand transition-colors">All of the market →</Link>}>
            Browse by category
          </SectionTitle>
          <CategoryGrid indices={categoryIndices} />
        </section>

        {/* Movers + Recently sold */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-x-14 gap-y-16 pt-16">
          <section>
            <SectionTitle aside="Twelve-month trend">Movers</SectionTitle>
            <TopMovers gainers={gainers} losers={losers} />
          </section>
          <section>
            <SectionTitle aside="Latest completed auctions">Recently sold</SectionTitle>
            <RecentlySold sales={recentSales} />
          </section>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
