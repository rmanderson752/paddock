import type { Metadata } from "next";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProfileDetailsForm, ChangePasswordForm } from "@/components/features/auth/ProfileForms";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portfolioItems, watchlistItems, priceAlerts, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Profile | Paddock" };

function countFor(table: typeof portfolioItems | typeof watchlistItems | typeof priceAlerts, userId: string): number {
  return db.select({ count: sql<number>`COUNT(*)` }).from(table).where(eq(table.userId, userId)).get()?.count ?? 0;
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/profile");

  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  const name = user?.name ?? session.name;
  const memberSince = user?.createdAt ? formatDate(user.createdAt.slice(0, 10)) : null;

  const initials = (name ?? session.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const counts = [
    { label: "Portfolio", value: countFor(portfolioItems, session.userId), href: "/portfolio" },
    { label: "Watchlist", value: countFor(watchlistItems, session.userId), href: "/watchlist" },
    { label: "Alerts", value: countFor(priceAlerts, session.userId), href: "/alerts" },
  ];

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:pb-6">
        <h1 className="font-serif text-2xl mb-6">Profile</h1>

        <div className="max-w-xl space-y-4">
          {/* Avatar + Name */}
          <Card className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-forest flex items-center justify-center text-xl font-medium text-cream shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-sand font-medium truncate">{name ?? "User"}</div>
              <div className="text-sm text-sand-subtle truncate">{session.email}</div>
              {memberSince && (
                <div className="text-[11px] text-sand-faint mt-0.5">Member since {memberSince}</div>
              )}
            </div>
          </Card>

          {/* Activity */}
          <div className="grid grid-cols-3 gap-3">
            {counts.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-xl bg-surface p-3.5 hover:bg-surface-hover transition-colors"
              >
                <div className="text-[11px] uppercase tracking-[0.5px] text-sand-subtle">{c.label}</div>
                <div className="text-xl font-serif text-sand mt-0.5">{c.value}</div>
              </Link>
            ))}
          </div>

          <ProfileDetailsForm name={name} email={session.email} />
          <ChangePasswordForm />

          {/* Sign Out */}
          <form action={logout}>
            <Button type="submit" variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
