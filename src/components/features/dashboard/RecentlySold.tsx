import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import { type Sale, type GenerationWithDetails, sourceLabels } from "@/lib/types";

interface RecentlySoldProps {
  sales: (Sale & { generation: GenerationWithDetails })[];
}

// A sale ledger: date and house on the left, the car in serif, the hammer price right.
export function RecentlySold({ sales }: RecentlySoldProps) {
  return (
    <ul className="divide-y divide-surface-border border-b border-surface-border">
      {sales.map((sale) => (
        <li key={sale.id}>
          <Link
            href={`/car/${sale.generation.make.slug}/${sale.generation.model.slug}/${sale.generation.slug}`}
            className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-5 py-4 group"
          >
            <div className="label-caps text-sand-faint numerals w-16">
              {formatDate(sale.saleDate).replace(/, \d{4}$/, "")}
            </div>
            <div className="min-w-0">
              <div className="display-serif text-[18px] text-sand truncate group-hover:underline decoration-[0.5px] underline-offset-4">
                {sale.year ?? sale.generation.yearStart} {sale.generation.make.name} {sale.generation.name}
              </div>
              <div className="text-[11px] text-sand-faint mt-1 truncate">
                {sourceLabels[sale.source] ?? sale.source}
                {sale.mileage ? ` · ${sale.mileage.toLocaleString()} mi` : ""}
                {sale.color ? ` · ${sale.color}` : ""}
              </div>
            </div>
            <div className="display-serif numerals text-[17px] text-sand">
              {formatPrice(sale.salePrice)}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
