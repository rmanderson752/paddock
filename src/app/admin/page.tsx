import type { Metadata } from "next";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
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
import { getRecentRefreshRuns } from "@/lib/refresh";
import { DEFAULT_SCHEDULE, describeSchedule, parseSchedule, nextRunAt } from "@/lib/scheduler";
import { formatDate } from "@/lib/utils";

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export const metadata: Metadata = { title: "Admin | Paddock" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/admin");
  if (!(await isAdmin(session))) redirect("/");

  const [asOf, refreshRuns, counts, zeroSalesGens, recentSales] = await Promise.all([
    getDataAsOfDate(),
    getRecentRefreshRuns(8),
    // One round trip for every headline count
    db
      .select({
        makes: sql<number>`(SELECT COUNT(*) FROM makes)`,
        models: sql<number>`(SELECT COUNT(*) FROM models)`,
        generations: sql<number>`(SELECT COUNT(*) FROM generations)`,
        sales: sql<number>`(SELECT COUNT(*) FROM sales)`,
        unsold: sql<number>`(SELECT COUNT(*) FROM sales WHERE sold = 0)`,
        users: sql<number>`(SELECT COUNT(*) FROM users)`,
        watchlist: sql<number>`(SELECT COUNT(*) FROM watchlist_items)`,
        portfolio: sql<number>`(SELECT COUNT(*) FROM portfolio_items)`,
        alerts: sql<number>`(SELECT COUNT(*) FROM price_alerts)`,
      })
      .from(sql`(SELECT 1) AS one`)
      .get(),
    // Generations with zero sales
    db
      .select({ name: schema.generations.name, id: schema.generations.id })
      .from(schema.generations)
      .leftJoin(schema.sales, sql`${schema.sales.generationId} = ${schema.generations.id}`)
      .groupBy(schema.generations.id)
      .having(sql`COUNT(${schema.sales.id}) = 0`)
      .all(),
    // Latest sales
    db
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
      .all(),
  ]);
  const n = (v: number | undefined) => Number(v ?? 0);
  const makeCount = n(counts?.makes);
  const modelCount = n(counts?.models);
  const genCount = n(counts?.generations);
  const saleCount = n(counts?.sales);
  const unsoldCount = n(counts?.unsold);
  const userCount = n(counts?.users);
  const watchlistCount = n(counts?.watchlist);
  const portfolioCount = n(counts?.portfolio);
  const alertCount = n(counts?.alerts);

  const scheduleSpec = process.env.REFRESH_SCHEDULE || DEFAULT_SCHEDULE;
  const schedule = parseSchedule(scheduleSpec);
  const inAppSchedulerOn = process.env.REFRESH_SCHEDULE_ENABLED === "true";
  const nextRun = nextRunAt(schedule);

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-12">
        <PageTitle eyebrow="Back office" title="Admin" />
        <p className="text-[13px] text-sand-muted pt-6 mb-8">
          Sale data through {formatDate(asOf)}. Scheduled refresh: {describeSchedule(schedule)} —{" "}
          {inAppSchedulerOn
            ? `in-app scheduler on, next run ${formatStamp(nextRun.toISOString())}`
            : "in-app scheduler off (set REFRESH_SCHEDULE_ENABLED=true, or use the launchd agent — npm run schedule:install)"}
          .
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
            <div key={stat.label} className="border-t border-surface-border pt-3">
              <div className="label-caps text-sand-subtle">{stat.label}</div>
              <div className="display-serif numerals text-[24px] text-sand mt-1">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <h2 className="label-caps text-sand mb-4">Actions</h2>
        <AdminActions />

        {/* Refresh history */}
        <div className="mt-8">
          <h2 className="label-caps text-sand mb-4">Refresh history</h2>
          <Card>
            {refreshRuns.length === 0 ? (
              <p className="text-sm text-sand-muted">
                No refreshes recorded yet. The first scheduled run, <code className="text-[12px]">npm run db:refresh</code>,
                or the button above will appear here.
              </p>
            ) : (
              <div className="divide-y divide-surface-border">
                {refreshRuns.map((run) => (
                  <div key={run.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                    <div className="min-w-0">
                      <span
                        className={
                          run.status === "ok"
                            ? "text-forest-light"
                            : run.status === "error"
                              ? "text-maroon-light"
                              : "text-sand-subtle"
                        }
                      >
                        {run.status === "ok" ? "✓" : run.status === "error" ? "✕" : "…"}
                      </span>
                      <span className="text-sand ml-2">{formatStamp(run.startedAt)}</span>
                      <span className="text-sand-faint ml-2 text-[11px]">{run.trigger}</span>
                      <div className="text-[12px] text-sand-muted truncate">{run.message ?? "running"}</div>
                    </div>
                    {run.finishedAt && (
                      <div className="text-[11px] text-sand-faint shrink-0">
                        {Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Zero sales warnings */}
        {zeroSalesGens.length > 0 && (
          <div className="mt-8">
            <h2 className="label-caps text-sand mb-4">
              Generations with zero sales ({zeroSalesGens.length}) — hidden until data arrives
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
          <h2 className="label-caps text-sand mb-4">Latest sales</h2>
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
