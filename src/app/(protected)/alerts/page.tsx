import type { Metadata } from "next";
import Link from "next/link";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionTitle } from "@/components/ui/SectionTitle";
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
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle
          eyebrow="Your collection"
          title="Alerts"
          description={
            alerts.length === 0
              ? "Watch for a sale or a target price on any car."
              : `${alerts.length} alert${alerts.length !== 1 ? "s" : ""}${
                  triggered ? ` · ${triggered} condition${triggered !== 1 ? "s" : ""} met` : ""
                }`
          }
        />

        <section className="pt-12">
          <SectionTitle>Your alerts</SectionTitle>
          <AlertList alerts={alerts} />
        </section>

        <section className="pt-16">
          <SectionTitle aside={<Link href="/watchlist" className="hover:text-sand transition-colors">Manage watchlist →</Link>}>
            Watchlist activity
          </SectionTitle>
          <AlertsFeed items={activity} />
        </section>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
