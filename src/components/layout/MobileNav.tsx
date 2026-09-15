"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Star, Briefcase, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 border-t-[0.5px] border-surface-border bg-surface-page/95 backdrop-blur-md sm:hidden"
    >
      <div className="flex justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-medium",
                active ? "text-forest" : "text-sand-subtle"
              )}
            >
              <Icon size={20} className={active ? "fill-forest/15" : ""} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
