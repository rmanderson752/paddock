import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { sourceLabels } from "@/lib/types";
import type { WatchlistActivityItem } from "@/lib/alerts";

interface AlertsFeedProps {
  items: WatchlistActivityItem[];
}

/** Recent completed sales for the cars on the user's watchlist. */
export function AlertsFeed({ items }: AlertsFeedProps) {
  if (items.length === 0) {
    return (
      <div className="border-y border-surface-border py-12 text-center">
        <p className="display-serif text-[20px] italic text-sand-muted">No sales recorded yet for the cars you watch.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-surface-border border-y border-surface-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/car/${item.car.make.slug}/${item.car.model.slug}/${item.car.slug}`}
            className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-5 py-4 group"
          >
            <div className="label-caps text-sand-faint numerals w-24 whitespace-nowrap">{formatDate(item.saleDate)}</div>
            <div className="min-w-0 truncate">
              <span className="display-serif text-[18px] text-sand group-hover:underline decoration-[0.5px] underline-offset-4">
                {item.car.make.name} {item.car.name}
              </span>
              <span className="label-caps text-sand-faint ml-3">{sourceLabels[item.source] ?? item.source}</span>
            </div>
            <div className="display-serif numerals text-[17px] text-sand">{formatPrice(item.salePrice)}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
