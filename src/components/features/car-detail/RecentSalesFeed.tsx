import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import { type Sale, type ActiveListing, sourceLabels } from "@/lib/types";

// Map common car colors to CSS colors
const colorMap: Record<string, string> = {
  "Rosso Corsa": "#CC0000",
  "Guards Red": "#CC0000",
  "Formula Red": "#CC0000",
  "Renaissance Red": "#B22222",
  "Arena Red": "#A52828",
  "Passion Red": "#CC0000",
  "Brilliant Red": "#CC0000",
  "Imola Red": "#CC0000",
  "New Formula Red": "#CC0000",
  "Vintage Red": "#8B0000",
  "Mark IV Red": "#B22222",
  "Fire Opal Red": "#CC0000",
  "Rubystone Red": "#9B111E",
  "Misano Red": "#CC0000",
  Red: "#CC0000",
  "Bayside Blue": "#3366CC",
  "Midnight Purple III": "#4B0082",
  "Midnight Purple": "#4B0082",
  "Montego Blue": "#1A3A5C",
  "Maritime Blue": "#1A3A5C",
  "Midnight Blue": "#191970",
  "Blu Tour de France": "#003399",
  "Blu Swaters": "#003366",
  "Blu Sirena": "#003366",
  "Arles Blue": "#3B6D8F",
  "Heritage Blue": "#3B5D8F",
  "Shark Blue": "#4477AA",
  Blue: "#3366CC",
  "Championship White": "#F5F5F0",
  "Grand Prix White": "#F5F5F0",
  "Glacier White": "#F0F0E8",
  "Alpine White": "#F5F5F0",
  "Centennial White": "#F5F5F0",
  "Scotia White": "#F5F5F0",
  "Wimbledon White": "#F5F5F0",
  Bianco: "#F5F5F0",
  White: "#F5F5F0",
  "Berlina Black": "#1A1A1A",
  "Pyrenees Black": "#1A1A1A",
  "Diamond Black": "#1A1A1A",
  "Carbon Black": "#1A1A1A",
  "Basalt Black": "#1A1A1A",
  "Obsidian Black": "#1A1A1A",
  Nero: "#1A1A1A",
  Black: "#1A1A1A",
  Silver: "#A0A0A0",
  "Sonic Silver": "#A0A0A0",
  "Silverstone Metallic": "#A0A0A0",
  "Silver Stone Metallic": "#A0A0A0",
  "Grigio Silverstone": "#A0A0A0",
  "Grigio Titanio": "#808080",
  "Titanium Silver": "#A0A0A0",
  "Steel Grey": "#808080",
  "Seal Grey": "#707070",
  "GT Silver": "#A0A0A0",
  "Tungsten Grey": "#707070",
  "Giallo Modena": "#FFD700",
  "Spa Yellow": "#FFD700",
  "Speed Yellow": "#FFD700",
  "Fayence Yellow": "#DAA520",
  "Phoenix Yellow": "#FFD700",
  Giallo: "#FFD700",
  "Lime Gold": "#CCCC00",
  "Bahama Yellow": "#FFD700",
  "Sonic Blue Mica": "#2244AA",
  "Rally Blue": "#2244AA",
  "Papaya Orange": "#FF6600",
  Orange: "#FF6600",
  "Dune Beige": "#C2B280",
  "Coniston Green": "#2E5B3C",
  "Beluga Black": "#1A1A1A",
  "Epsom Green": "#4A7A5C",
  Green: "#2E5B3C",
  "Python Green": "#556B2F",
  "RS Green": "#006400",
  "Brooklands Green": "#2E5B3C",
  "Ocean Jade": "#3A7A6A",
  Olive: "#6B6B3C",
  "Lachssilber": "#C0B0A0",
  "AMG Solarbeam Yellow": "#FFD700",
  "Designo Magno Alanite Grey": "#808080",
  "Sport Classic Grey": "#808080",
  "Carrara White": "#F5F5F0",
  "Sebring Silver": "#A0A0A0",
  "Cool Silver": "#A0A0A0",
  "Amethyst Metallic": "#6B3FA0",
  "Metallic Brown": "#6B4226",
  "Slate Blue": "#5577AA",
  "Freeborn Red": "#CC3333",
  "Sky Blue": "#6699CC",
  "Viola SE30": "#6B3FA0",
  "Argento Nürburgring": "#A0A0A0",
  "BMW Motorsport": "#0066CC",
  "Dark Silver": "#707070",
  "Royal Maroon": "#6B1A2A",
  "Rosso": "#CC0000",
  "Turquoise": "#30B0B0",
};

function getColorDot(colorName: string | null): string | null {
  if (!colorName) return null;
  return colorMap[colorName] ?? null;
}

interface RecentSalesFeedProps {
  sales: Sale[];
  activeListings?: ActiveListing[];
}

export function RecentSalesFeed({ sales, activeListings }: RecentSalesFeedProps) {
  const recentSales = sales.slice(-15).reverse();

  return (
    <div className="space-y-4">
      {/* Sold Sales */}
      <Card>
        <h3 className="text-sm font-medium text-sand mb-3">Recent Sales</h3>
        <div className="divide-y divide-surface-border">
          {recentSales.map((sale, i) => {
            const dotColor = getColorDot(sale.color);
            return (
              <div
                key={sale.id}
                className={`flex items-start justify-between py-2.5 ${
                  i % 2 === 1 ? "bg-white/[0.02] -mx-4 px-4 sm:-mx-5 sm:px-5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {dotColor && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: dotColor }}
                      title={sale.color ?? undefined}
                    />
                  )}
                  <div>
                    <div className="text-[13px] text-sand">{sale.saleDate}</div>
                    <div className="text-[11px] text-sand-faint mt-0.5">
                      {sale.mileage ? `${sale.mileage.toLocaleString()} mi` : "N/A"}
                      {sale.color && ` · ${sale.color}`}
                      {" · "}
                      <span className="text-forest-light">
                        {sourceLabels[sale.source] ?? sale.source}
                      </span>
                    </div>
                    {sale.conditionNotes && (
                      <div className="text-[10px] text-sand-faint mt-0.5 italic">
                        {sale.conditionNotes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[13px] font-medium text-sand shrink-0 ml-3">
                  {formatPrice(sale.salePrice)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Listings */}
      {activeListings && activeListings.length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-gold mb-3">Active Listings</h3>
          <div className="divide-y divide-surface-border">
            {activeListings.map((listing) => {
              const dotColor = getColorDot(listing.color);
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
        </Card>
      )}
    </div>
  );
}
