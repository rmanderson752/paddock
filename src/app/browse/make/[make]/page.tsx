import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { getMakeBySlug, getGenerationsByMakeSlug, getSparklineDataForGenerations } from "@/lib/data";

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
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle
          crumbs={[{ href: "/browse", label: "Browse" }]}
          eyebrow={"Marque"}
          title={makeData.name}
          description={`${cars.length} model${cars.length !== 1 ? "s" : ""} tracked`}
        />
        <div className="pt-8">
          <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage={`No models found for ${makeData.name}.`}
        />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
