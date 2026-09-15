import Link from "next/link";
import { Card } from "@/components/ui/Card";
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
      <Card>
        <p className="text-sm text-sand-muted">No sales recorded yet for the cars you watch.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-surface-border">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/car/${item.car.make.slug}/${item.car.model.slug}/${item.car.slug}`}
            className="flex items-center gap-3 py-2.5 -mx-4 px-4 sm:-mx-5 sm:px-5 hover:bg-surface-hover transition-colors"
          >
            <div className="w-2 h-2 rounded-full shrink-0 bg-forest-light" />
            <div className="flex-1 text-[13px] text-sand-muted min-w-0 truncate">
              <strong className="text-sand font-medium">
                {item.car.make.name} {item.car.name}
              </strong>{" "}
              sold for {formatPrice(item.salePrice)} on {sourceLabels[item.source] ?? item.source}
            </div>
            <div className="text-[11px] text-sand-faint shrink-0">{formatDate(item.saleDate)}</div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
