import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { CompareClient } from "@/components/features/compare/CompareClient";
import { getGenerationsWithDetailsByIds } from "@/lib/data";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = ids?.split(",").filter(Boolean) ?? [];

  const cars = await getGenerationsWithDetailsByIds(idList.slice(0, 4)); // max 4 cars

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle eyebrow="Side by side" title="Compare" description="Up to four cars, values and trends in one ledger." />
        <div className="pt-8">
          <CompareClient initialCars={cars} />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
