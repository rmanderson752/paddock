import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { getGenerationsByEra, getSparklineDataForGenerations } from "@/lib/data";
import { eras, type Era } from "@/lib/types";

export default async function BrowseEraPage({
  params,
}: {
  params: Promise<{ era: string }>;
}) {
  const { era } = await params;
  const eraData = eras.find((e) => e.value === era);
  if (!eraData) notFound();

  const cars = await getGenerationsByEra(era as Era);
  const sparklineData = await getSparklineDataForGenerations(cars.map((c) => c.id));

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle
          crumbs={[{ href: "/browse", label: "Browse" }]}
          eyebrow={"Era"}
          title={eraData.label}
          description={`${cars.length} model${cars.length !== 1 ? "s" : ""} from this era`}
        />
        <div className="pt-8">
          <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage="No models from this era."
        />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
