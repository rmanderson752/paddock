import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SearchDropdown } from "@/components/features/search/SearchDropdown";
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
  const [results, categoryIndices] = await Promise.all([
    q ? searchGenerations(q) : Promise.resolve([]),
    getCategoryIndices(),
  ]);

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        {q ? (
          <>
            <PageTitle
              eyebrow="Search"
              title={`“${q}”`}
              description={`${results.length} result${results.length !== 1 ? "s" : ""}`}
            />
            <div className="pt-8">
              <SortableResults
                results={results}
                emptyMessage={`Nothing tracked matches “${q}”. Try a marque, model or chassis code.`}
              />
            </div>
          </>
        ) : (
          <>
            <PageTitle eyebrow="Search" title="Find a car" description="By marque, model, generation or chassis code." />
            <div className="pt-8 max-w-md">
              <SearchDropdown />
            </div>
            <section className="pt-16">
              <SectionTitle>Or browse by category</SectionTitle>
              <CategoryGrid indices={categoryIndices} />
            </section>
          </>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
