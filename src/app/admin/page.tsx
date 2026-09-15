import type { Metadata } from "next";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { getSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { AdminActions } from "@/components/features/admin/AdminActions";
import { getDataAsOfDate } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin | Paddock" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/admin");
  if (!isAdmin(session)) redirect("/");

  const asOf = getDataAsOfDate();

  // Gather stats
  const genCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.generations).get()!.count;
  const makeCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.makes).get()!.count;
  const modelCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.models).get()!.count;
  const saleCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.sales).get()!.count;
  const userCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.users).get()!.count;
  const watchlistCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.watchlistItems).get()!.count;
  const portfolioCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.portfolioItems).get()!.count;
  const alertCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.priceAlerts).get()!.count;
  const unsoldCount = db.select({ count: sql<number>`COUNT(*)` }).from(schema.sales).where(sql`${schema.sales.sold} = 0`).get()!.count;

  // Generations with zero sales
  const zeroSalesGens = db
    .select({
      name: schema.generations.name,
      id: schema.generations.id,
    })
    .from(schema.generations)
    .leftJoin(schema.sales, sql`${schema.sales.generationId} = ${schema.generations.id}`)
    .groupBy(schema.generations.id)
    .having(sql`COUNT(${schema.sales.id}) = 0`)
    .all();

  // Recent sales (last 5)
  const recentSales = db
    .select({
      saleDate: schema.sales.saleDate,
      salePrice: schema.sales.salePrice,
      source: schema.sales.source,
      genName: schema.generations.name,
    })
    .from(schema.sales)
    .innerJoin(schema.generations, sql`${schema.generations.id} = ${schema.sales.generationId}`)
    .orderBy(sql`${schema.sales.saleDate} DESC`)
    .limit(5)
    .all();

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="font-serif text-2xl mb-1">Admin Dashboard</h1>
        <p className="text-sm text-sand-muted mb-6">
          Sale data through {formatDate(asOf)}. Run <code className="text-[12px]">npm run db:scrape</code> to
          pull new auction results, then recompute stats below.
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Makes", value: makeCount },
            { label: "Models", value: modelCount },
            { label: "Generations", value: genCount },
            { label: "Sales Records", value: `${saleCount.toLocaleString()} (${unsoldCount} bid-not-met)` },
            { label: "Users", value: userCount },
            { label: "Watchlist Items", value: watchlistCount },
            { label: "Portfolio Items", value: portfolioCount },
            { label: "Price Alerts", value: alertCount },
          ].map((stat) => (
            <Card key={stat.label}>
              <div className="text-[11px] uppercase tracking-wide text-sand-faint">{stat.label}</div>
              <div className="text-xl font-serif mt-1">{stat.value}</div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <h2 className="text-sm font-medium text-sand mb-3">Actions</h2>
        <AdminActions />

        {/* Zero sales warnings */}
        {zeroSalesGens.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-sand mb-3">
              Generations with Zero Sales ({zeroSalesGens.length}) — hidden from browse until data arrives
            </h2>
            <Card>
              <div className="divide-y divide-surface-border">
                {zeroSalesGens.map((g) => (
                  <div key={g.id} className="py-2 text-sm text-sand-muted">
                    {g.name}
                    <span className="text-[11px] text-sand-faint ml-2">{g.id}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Recent sales */}
        <div className="mt-8">
          <h2 className="text-sm font-medium text-sand mb-3">Latest Sales</h2>
          <Card>
            <div className="divide-y divide-surface-border">
              {recentSales.map((s, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <div>
                    <span className="text-sand">{s.genName}</span>
                    <span className="text-sand-faint ml-2 text-[11px]">{s.source} · {s.saleDate}</span>
                  </div>
                  <div className="text-sand">
                    ${(s.salePrice / 100).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
