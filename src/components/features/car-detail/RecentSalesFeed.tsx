import { SectionTitle } from "@/components/ui/SectionTitle";
import { formatPrice, formatDate } from "@/lib/utils";

import { colorFamilySwatch, FLAG_LABELS, type ConditionFlag, type Sale, type ActiveListing, sourceLabels } from "@/lib/types";

// Colour dots come from the extracted colour family; a handful of common
// names cover sales that haven't been through extraction yet.
const legacyColorMap: Record<string, string> = {
  Red: "#b3261e", Blue: "#2f4f8f", White: "#f4f1ea", Black: "#1a1a1a", Silver: "#b8b8b4",
  Grey: "#7a7d7a", Gray: "#7a7d7a", Yellow: "#e2c02a", Green: "#2f5d43", Orange: "#e0731d",
};

function getColorDot(sale: Pick<Sale, "color" | "details">): string | null {
  if (sale.details?.colorFamily) return colorFamilySwatch[sale.details.colorFamily] ?? null;
  if (!sale.color) return null;
  const word = Object.keys(legacyColorMap).find((k) => sale.color!.toLowerCase().includes(k.toLowerCase()));
  return word ? legacyColorMap[word] : null;
}

// Flags a buyer weighs; positive ones read green, cautions read taupe
const cautionFlags = new Set<ConditionFlag>(["accident_history", "rust_or_corrosion", "needs_work", "engine_replaced_or_rebuilt", "repaint"]);

function FlagTag({ flag }: { flag: string }) {
  const label = FLAG_LABELS[flag as ConditionFlag];
  if (!label) return null;
  const caution = cautionFlags.has(flag as ConditionFlag);
  return (
    <span
      className={`label-caps rounded-[2px] px-1.5 py-0.5 ${
        caution ? "bg-maroon-muted text-maroon-light" : "bg-forest-muted text-forest-light"
      }`}
    >
      {label}
    </span>
  );
}

interface RecentSalesFeedProps {
  sales: Sale[];
  activeListings?: ActiveListing[];
}

export function RecentSalesFeed({ sales, activeListings }: RecentSalesFeedProps) {
  const recentSales = sales.slice(-15).reverse();

  return (
    <div className="space-y-10 pt-10">
      {/* Sold Sales */}
      <section>
        <SectionTitle aside={`${sales.length} completed`}>Sale record</SectionTitle>
        <ul className="divide-y divide-surface-border border-b border-surface-border">
          {recentSales.map((sale) => {
            const dotColor = getColorDot(sale);
            const d = sale.details;
            const meta = [
              sale.year ? String(sale.year) : null,
              sale.mileage ? `${sale.mileage.toLocaleString()} mi${d?.mileageTmu ? " (TMU)" : ""}` : "Mileage not stated",
              sale.color,
              d?.transmission === "manual" ? "Manual" : d?.transmission === "automatic" ? "Automatic" : null,
            ].filter(Boolean);
            const provenance = [
              d?.owners === 1 ? "One owner" : d?.owners ? `${d.owners} owners` : null,
              d?.yearsOwned && d.yearsOwned >= 5 ? `${d.yearsOwned} years owned` : null,
              d?.titleStatus && d.titleStatus !== "clean" ? `${d.titleStatus} title` : null,
            ].filter(Boolean);
            return (
              <li key={sale.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-x-5 py-4">
                <div className="label-caps text-sand-faint numerals w-24 pt-1 whitespace-nowrap">{formatDate(sale.saleDate)}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13px] text-sand">
                    {dotColor && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 ring-1 ring-surface-border"
                        style={{ backgroundColor: dotColor }}
                        title={sale.color ?? undefined}
                      />
                    )}
                    <span>{meta.join(" · ")}</span>
                  </div>
                  <div className="label-caps text-sand-faint mt-1.5">
                    {sourceLabels[sale.source] ?? sale.source}
                    {provenance.length > 0 && ` · ${provenance.join(" · ")}`}
                  </div>
                  {sale.conditionNotes && (
                    <div className="text-[12px] leading-relaxed text-sand-subtle mt-1.5 italic max-w-2xl">
                      {sale.conditionNotes}
                    </div>
                  )}
                  {d && d.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.flags.map((f) => (
                        <FlagTag key={f} flag={f} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="display-serif numerals text-[18px] text-sand shrink-0">
                  {formatPrice(sale.salePrice)}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Active Listings */}
      {activeListings && activeListings.length > 0 && (
        <section>
          <SectionTitle>Currently listed</SectionTitle>
          <div className="divide-y divide-surface-border">
            {activeListings.map((listing) => {
              const dotColor = getColorDot({ color: listing.color, details: null });
              return (
                <div
                  key={listing.id}
                  className="flex items-start justify-between py-2.5"
                >
                  <div className="flex items-start gap-2">
                    {dotColor && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: dotColor }}
                        title={listing.color ?? undefined}
                      />
                    )}
                    <div>
                      <div className="text-[13px] text-sand">
                        {listing.year} · {listing.color}
                        {listing.mileage && ` · ${listing.mileage.toLocaleString()} mi`}
                      </div>
                      <div className="text-[11px] text-sand-faint mt-0.5">
                        Listed on{" "}
                        <span className="text-gold">
                          {sourceLabels[listing.source] ?? listing.source}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[13px] font-medium text-gold shrink-0 ml-3">
                    {formatPrice(listing.askingPrice)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
