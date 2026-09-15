"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/Logo";
import { SearchDropdown } from "@/components/features/search/SearchDropdown";
import { UserMenu } from "@/components/features/auth/UserMenu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: { name: string | null; email: string; isAdmin?: boolean } | null;
}

const navItems = [
  { href: "/browse", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/alerts", label: "Alerts" },
];

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-[0.5px] border-surface-border bg-surface-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 sm:gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <LogoMark size={22} />
          <span className="font-serif text-xl text-sand">Paddock</span>
        </Link>

        <div className="hidden sm:block flex-1 max-w-md">
          <SearchDropdown />
        </div>

        <nav className="hidden sm:flex items-center gap-4 ml-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm transition-colors hover:text-sand",
                pathname.startsWith(item.href) ? "text-sand font-medium" : "text-sand-subtle"
              )}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <UserMenu name={user.name} email={user.email} isAdmin={user.isAdmin} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-forest px-3.5 py-1.5 text-sm font-medium text-cream hover:bg-forest-dark transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile: account access lives here; the rest is in the bottom tab bar */}
        <div className="sm:hidden ml-auto flex items-center">
          {user ? (
            <UserMenu name={user.name} email={user.email} isAdmin={user.isAdmin} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-forest px-3 py-1.5 text-[12px] font-medium text-cream hover:bg-forest-dark transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
