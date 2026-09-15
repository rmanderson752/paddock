import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { CategoryGrid } from "@/components/features/search/CategoryGrid";
import { searchGenerations, getCategoryIndices } from "@/lib/data";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? searchGenerations(q) : [];
  const categoryIndices = getCategoryIndices();

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        {q ? (
          <>
            <h1 className="font-serif text-2xl mb-6">
              Results for &ldquo;{q}&rdquo;
            </h1>
            <SortableResults
              results={results}
              emptyMessage={`No cars found for "${q}". Try a different search.`}
            />
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl mb-6">Browse Categories</h1>
            <CategoryGrid indices={categoryIndices} />
          </>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
