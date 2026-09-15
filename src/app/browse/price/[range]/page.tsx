import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { getGenerationsByPriceRange, getSparklineDataForGenerations } from "@/lib/data";
import { priceRanges, type PriceRange } from "@/lib/types";
import Link from "next/link";

export default async function BrowsePricePage({
  params,
}: {
  params: Promise<{ range: string }>;
}) {
  const { range } = await params;
  const priceRange = priceRanges.find((r) => r.value === range);
  if (!priceRange) notFound();

  const cars = getGenerationsByPriceRange(range as PriceRange);
  const sparklineData = getSparklineDataForGenerations(cars.map((c) => c.id));

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <div className="flex items-center gap-2 text-[12px] text-sand-subtle mb-4">
          <Link href="/browse" className="hover:text-sand transition-colors">
            Browse
          </Link>
          <span className="text-sand-faint">/</span>
          <span className="text-sand">{priceRange.label}</span>
        </div>

        <h1 className="font-serif text-2xl mb-1">{priceRange.label}</h1>
        <p className="text-sm text-sand-muted mb-6">
          {cars.length} model{cars.length !== 1 ? "s" : ""} in this price range
        </p>
        <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage="No models in this price range."
        />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
