import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatPrice, formatDate } from "@/lib/utils";
import { type Sale, type GenerationWithDetails, sourceShortLabels } from "@/lib/types";

interface RecentlySoldProps {
  sales: (Sale & { generation: GenerationWithDetails })[];
}

export function RecentlySold({ sales }: RecentlySoldProps) {
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-surface-border">
        {sales.map((sale) => (
          <Link
            key={sale.id}
            href={`/car/${sale.generation.make.slug}/${sale.generation.model.slug}/${sale.generation.slug}`}
            className="flex items-center justify-between py-2.5 hover:bg-surface-hover -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-sand truncate">
                {sale.year ?? sale.generation.yearStart} {sale.generation.make.name}{" "}
                {sale.generation.name}
              </div>
              <div className="text-[11px] text-sand-faint mt-0.5 line-clamp-2">
                {sale.mileage ? `${sale.mileage.toLocaleString()} mi · ` : ""}
                {sale.conditionNotes ?? "No notes"}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="text-[13px] font-medium text-sand">
                {formatPrice(sale.salePrice)}
              </div>
              <div className="text-[10px] text-sand-subtle mt-0.5">
                {sourceShortLabels[sale.source] ?? sale.source} · {formatDate(sale.saleDate)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
