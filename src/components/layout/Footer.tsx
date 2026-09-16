import Link from "next/link";
import { Wordmark } from "@/components/ui/Logo";
import { getDataAsOfDate } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/browse", label: "Browse" },
      { href: "/search", label: "Search" },
      { href: "/compare", label: "Compare" },
    ],
  },
  {
    title: "Collection",
    links: [
      { href: "/watchlist", label: "Watchlist" },
      { href: "/portfolio", label: "Portfolio" },
      { href: "/alerts", label: "Alerts" },
    ],
  },
];

export async function Footer() {
  const asOf = await getDataAsOfDate();

  return (
    <footer className="hidden sm:block border-t border-surface-border mt-24">
      <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-sand-subtle">
            Follow the cars you&apos;ve always wanted, and know what they&apos;re really worth.
          </p>
          <p className="mt-4 label-caps text-sand-faint">Sale data through {formatDate(asOf)}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title}>
            <div className="label-caps text-sand mb-4">{col.title}</div>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[13px] text-sand-subtle hover:text-sand transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-surface-border">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between label-caps text-sand-faint">
          <span>© {new Date().getFullYear()} Paddock · Outpost Studios</span>
          <span>Prices in USD</span>
        </div>
      </div>
    </footer>
  );
}
