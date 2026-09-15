import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { getMakeBySlug, getGenerationsByMakeSlug, getSparklineDataForGenerations } from "@/lib/data";
import Link from "next/link";

export default async function BrowseMakePage({
  params,
}: {
  params: Promise<{ make: string }>;
}) {
  const { make } = await params;
  const makeData = await getMakeBySlug(make);
  if (!makeData) notFound();

  const cars = await getGenerationsByMakeSlug(make);
  const sparklineData = await getSparklineDataForGenerations(cars.map((c) => c.id));

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <div className="flex items-center gap-2 text-[12px] text-sand-subtle mb-4">
          <Link href="/browse" className="hover:text-sand transition-colors">
            Browse
          </Link>
          <span className="text-sand-faint">/</span>
          <span className="text-sand">{makeData.name}</span>
        </div>

        <h1 className="font-serif text-2xl mb-1">{makeData.name}</h1>
        <p className="text-sm text-sand-muted mb-6">
          {cars.length} model{cars.length !== 1 ? "s" : ""} tracked
        </p>
        <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage={`No models found for ${makeData.name}.`}
        />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
