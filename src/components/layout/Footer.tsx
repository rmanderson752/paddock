import Link from "next/link";
import { getDataAsOfDate } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/search", label: "Search" },
];

export function Footer() {
  const asOf = getDataAsOfDate();

  return (
    <footer className="hidden sm:block border-t-[0.5px] border-surface-border py-8 mt-16">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sand-faint">
        <div>
          Paddock — collector car value tracking. Sale data through {formatDate(asOf)}.
        </div>
        <nav className="flex items-center gap-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-sand transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
