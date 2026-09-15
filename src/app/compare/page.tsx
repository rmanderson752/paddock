import { HeaderServer } from "@/components/layout/HeaderServer";
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
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <h1 className="font-serif text-2xl mb-1">Compare</h1>
        <p className="text-sm text-sand-muted mb-6">
          Compare up to 4 cars side by side.
        </p>
        <CompareClient initialCars={cars} />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
