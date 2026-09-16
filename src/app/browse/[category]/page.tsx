import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { SortableResults } from "@/components/features/search/SortableResults";
import { getGenerationsByCategory, getSparklineDataForGenerations } from "@/lib/data";

const categoryLabels: Record<string, string> = {
  jdm: "JDM Icons",
  supercar: "Supercars & Exotics",
  retro: "Air-Cooled Porsche & Retro",
  modern_luxury: "Modern Luxury Performance",
  modern_collectible: "Modern Collectibles",
  truck_suv: "Trucks & SUVs",
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const label = categoryLabels[category];
  return { title: label ? `${label} | Paddock` : "Not Found | Paddock" };
}

export default async function BrowseCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const label = categoryLabels[category];
  if (!label) notFound();
  const cars = await getGenerationsByCategory(category);
  const sparklineData = await getSparklineDataForGenerations(cars.map((c) => c.id));

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle
          crumbs={[{ href: "/browse", label: "Browse" }]}
          eyebrow={"Category"}
          title={label}
          description={`${cars.length} model${cars.length !== 1 ? "s" : ""} tracked`}
        />
        <div className="pt-8">
          <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage="No models in this category yet."
        />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
