import type { Metadata } from "next";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { PortfolioClient } from "@/components/features/portfolio/PortfolioClient";
import { type PortfolioItem } from "@/components/features/portfolio/PortfolioTable";
import { getGenerationsWithDetailsByIds } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portfolioItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Portfolio | Paddock" };

export default async function PortfolioPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/portfolio");

  // Fetch user's portfolio from DB
  const dbItems = await db
    .select()
    .from(portfolioItems)
    .where(eq(portfolioItems.userId, session.userId))
    .all();
  const cars = new Map(
    (await getGenerationsWithDetailsByIds([...new Set(dbItems.map((r) => r.generationId))])).map((c) => [c.id, c])
  );

  const items: PortfolioItem[] = dbItems
    .map((row) => {
      const car = cars.get(row.generationId);
      if (!car) return null;
      return {
        id: row.id,
        car,
        purchasePrice: row.purchasePrice,
        year: row.year,
        notes: row.notes,
      };
    })
    .filter((item): item is PortfolioItem => item !== null);

  const totalValue = items.reduce(
    (sum, item) => sum + item.car.stats.avgPrice12mo,
    0
  );
  const totalInvested = items.reduce(
    (sum, item) => sum + item.purchasePrice,
    0
  );

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle eyebrow="Your collection" title="Portfolio" description="What you paid against what the market is paying now." />
        <div className="pt-8">
        <PortfolioClient
          items={items}
          totalValue={totalValue}
          totalInvested={totalInvested}
        />
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
