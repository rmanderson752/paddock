import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { getGenerationsByPriceRange, getSparklineDataForGenerations } from "@/lib/data";
import { priceRanges, type PriceRange } from "@/lib/types";

export default async function BrowsePricePage({
  params,
}: {
  params: Promise<{ range: string }>;
}) {
  const { range } = await params;
  const priceRange = priceRanges.find((r) => r.value === range);
  if (!priceRange) notFound();

  const cars = await getGenerationsByPriceRange(range as PriceRange);
  const sparklineData = await getSparklineDataForGenerations(cars.map((c) => c.id));

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle
          crumbs={[{ href: "/browse", label: "Browse" }]}
          eyebrow={"Price"}
          title={priceRange.label}
          description={`${cars.length} model${cars.length !== 1 ? "s" : ""} in this range, by twelve-month average`}
        />
        <div className="pt-8">
          <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage="No models in this price range."
        />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
