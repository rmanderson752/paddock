import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { CarHeader } from "@/components/features/car-detail/CarHeader";
import { CarDetailClient } from "@/components/features/car-detail/CarDetailClient";
import { findGenerationBySlug, getSalesForGeneration, getActiveListingsForGeneration, getDataAsOfDate } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { isWatching } from "@/lib/auth/watchlist-actions";

function formatPriceSeo(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ make: string; model: string; generation: string }>;
}): Promise<Metadata> {
  const { make, model, generation } = await params;
  const car = await findGenerationBySlug(make, model, generation);
  // Metadata resolves before the response streams, so a 404 raised here gets a
  // real 404 status (inside the page it would arrive after the 200 shell).
  if (!car) notFound();

  const price = formatPriceSeo(car.stats.avgPrice12mo);
  return {
    title: `${car.make.name} ${car.name} Value & Price History | Paddock`,
    description: `Track ${car.make.name} ${car.name} (${car.yearStart}–${car.yearEnd ?? "present"}) values. Average price: ${price}. ${car.stats.salesCount12mo} sales in the last 12 months.`,
    openGraph: {
      title: `${car.make.name} ${car.name} — ${price} | Paddock`,
      description: car.description ?? `Collector car value tracking for ${car.make.name} ${car.name}.`,
    },
  };
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ make: string; model: string; generation: string }>;
}) {
  const { make, model, generation } = await params;
  const car = await findGenerationBySlug(make, model, generation);

  if (!car) {
    notFound();
  }

  const [sales, asOf, session] = await Promise.all([
    getSalesForGeneration(car.id),
    getDataAsOfDate(),
    getSession(),
  ]);
  const activeListings = getActiveListingsForGeneration();
  const watched = session ? await isWatching(car.id) : false;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${car.make.name} ${car.name}`,
    description: car.description ?? `${car.make.name} ${car.name} (${car.yearStart}–${car.yearEnd ?? "present"})`,
    brand: { "@type": "Brand", name: car.make.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (car.stats.low52wk / 100).toFixed(0),
      highPrice: (car.stats.high52wk / 100).toFixed(0),
      offerCount: car.stats.salesCount12mo,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <CarHeader car={car} isWatched={watched} isAuthenticated={!!session} />

        <div className="mt-6">
          <CarDetailClient
            generationId={car.id}
            stats={car.stats}
            allSales={sales}
            activeListings={activeListings}
            asOf={asOf}
          />
        </div>

        {car.description && (
          <div className="mt-6 text-sm text-sand-muted leading-relaxed">
            {car.description}
          </div>
        )}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
