import type { Metadata } from "next";
import Link from "next/link";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { AlertList } from "@/components/features/alerts/AlertList";
import { AlertsFeed } from "@/components/features/alerts/AlertsFeed";
import { getSession } from "@/lib/auth/session";
import { getUserAlerts, getWatchlistActivity } from "@/lib/alerts";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Alerts | Paddock" };

export default async function AlertsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/alerts");

  const [alerts, activity] = await Promise.all([
    getUserAlerts(session.userId),
    getWatchlistActivity(session.userId, 20),
  ]);
  const triggered = alerts.filter((a) => a.triggered).length;

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <h1 className="font-serif text-2xl mb-1">Alerts</h1>
        <p className="text-sm text-sand-muted mb-6">
          {alerts.length === 0
            ? "Watch for a sale or a target price on any car."
            : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""}${
                triggered ? ` · ${triggered} condition${triggered !== 1 ? "s" : ""} met` : ""
              }`}
        </p>

        <section className="mb-10">
          <h2 className="text-sm font-medium text-sand mb-3">Your alerts</h2>
          <AlertList alerts={alerts} />
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-medium text-sand">Watchlist activity</h2>
            <Link href="/watchlist" className="text-[12px] text-sand-subtle hover:text-sand transition-colors">
              Manage watchlist →
            </Link>
          </div>
          <AlertsFeed items={activity} />
        </section>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
