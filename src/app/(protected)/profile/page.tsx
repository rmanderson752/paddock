import type { Metadata } from "next";
import { HeaderServer } from "@/components/layout/HeaderServer";
import { PageTitle } from "@/components/ui/PageTitle";
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

async function countFor(table: typeof portfolioItems | typeof watchlistItems | typeof priceAlerts, userId: string): Promise<number> {
  const row = await db.select({ count: sql<number>`COUNT(*)` }).from(table).where(eq(table.userId, userId)).get();
  return Number(row?.count ?? 0);
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/profile");

  const [user, portfolioCount, watchlistCount, alertCount] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).get(),
    countFor(portfolioItems, session.userId),
    countFor(watchlistItems, session.userId),
    countFor(priceAlerts, session.userId),
  ]);
  const name = user?.name ?? session.name;
  const memberSince = user?.createdAt ? formatDate(user.createdAt.slice(0, 10)) : null;
  const hasPassword = Boolean(user?.passwordHash);
  const usesGoogle = Boolean(user?.googleId);
  const avatarUrl = user?.avatarUrl ?? session.avatarUrl ?? null;

  const initials = (name ?? session.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const counts = [
    { label: "Portfolio", value: portfolioCount, href: "/portfolio" },
    { label: "Watchlist", value: watchlistCount, href: "/watchlist" },
    { label: "Alerts", value: alertCount, href: "/alerts" },
  ];

  return (
    <>
      <HeaderServer />
      <main className="mx-auto max-w-6xl px-5 sm:px-6 pb-24 sm:pb-6">
        <PageTitle eyebrow="Account" title="Profile" />

        <div className="max-w-xl space-y-5 pt-8">
          {/* Avatar + Name */}
          <Card className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google avatar, unknown host
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover bg-forest shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-forest flex items-center justify-center text-xl font-medium text-cream shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="display-serif text-[22px] text-sand truncate">{name ?? "User"}</div>
              <div className="text-[13px] text-sand-subtle truncate">{session.email}</div>
              <div className="label-caps text-sand-faint mt-1.5">
                {memberSince && `Member since ${memberSince}`}
                {usesGoogle && `${memberSince ? " · " : ""}Signed in with Google`}
              </div>
            </div>
          </Card>

          {/* Activity */}
          <div className="grid grid-cols-3 gap-3">
            {counts.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="border-t border-surface-border pt-3 hover:text-forest transition-colors"
              >
                <div className="label-caps text-sand-subtle">{c.label}</div>
                <div className="display-serif numerals text-[26px] text-sand mt-1">{c.value}</div>
              </Link>
            ))}
          </div>

          <ProfileDetailsForm name={name} email={session.email} />
          {hasPassword ? (
            <ChangePasswordForm />
          ) : (
            <Card>
              <h2 className="label-caps text-sand mb-2">Password</h2>
              <p className="text-[13px] text-sand-muted">
                This account signs in with Google, so there&apos;s no password to manage.
              </p>
            </Card>
          )}

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
