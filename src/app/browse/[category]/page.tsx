import Link from "next/link";
import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
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
  const cars = getGenerationsByCategory(category);
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
          <span className="text-sand">{label}</span>
        </div>

        <h1 className="font-serif text-2xl mb-1">{label}</h1>
        <p className="text-sm text-sand-muted mb-6">
          {cars.length} model{cars.length !== 1 ? "s" : ""} tracked
        </p>
        <SortableResults
          results={cars}
          showSparklines
          sparklineData={sparklineData}
          emptyMessage="No models in this category yet."
        />
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
