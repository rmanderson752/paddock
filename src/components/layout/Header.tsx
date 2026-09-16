"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/Logo";
import { SearchDropdown } from "@/components/features/search/SearchDropdown";
import { UserMenu } from "@/components/features/auth/UserMenu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: { name: string | null; email: string; avatarUrl?: string | null; isAdmin?: boolean } | null;
}

const navItems = [
  { href: "/browse", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/alerts", label: "Alerts" },
];

// A quiet masthead: wordmark, tracked-capital navigation, hairline underneath.
export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface-page/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-6">
        <Link href="/" className="shrink-0">
          <Wordmark />
        </Link>

        <div className="hidden md:block flex-1 max-w-sm">
          <SearchDropdown />
        </div>

        <nav className="hidden sm:flex items-center gap-7 ml-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "label-caps pb-0.5 border-b transition-colors duration-200",
                pathname.startsWith(item.href)
                  ? "border-sand text-sand"
                  : "border-transparent text-sand-subtle hover:text-sand"
              )}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} isAdmin={user.isAdmin} />
          ) : (
            <Link
              href="/login"
              className="label-caps rounded-[3px] bg-forest px-4 py-2.5 text-cream hover:bg-forest-dark transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: account access lives here; the rest is in the bottom tab bar */}
        <div className="sm:hidden ml-auto flex items-center">
          {user ? (
            <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} isAdmin={user.isAdmin} />
          ) : (
            <Link
              href="/login"
              className="label-caps rounded-[3px] bg-forest px-3.5 py-2 text-cream hover:bg-forest-dark transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
