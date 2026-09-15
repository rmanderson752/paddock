"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatPrice, formatPriceShort } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Plus, Search } from "lucide-react";

interface CompareClientProps {
  /** Cars resolved on the server from the `ids` query param — the URL is the source of truth */
  initialCars: GenerationWithDetails[];
}

interface SearchResult {
  id: string;
  make: { name: string; slug: string };
  model: { name: string; slug: string };
  name: string;
  slug: string;
  stats: { avgPrice12mo: number };
}

export function CompareClient({ initialCars: cars }: CompareClientProps) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  function removeCar(id: string) {
    const ids = cars.filter((c) => c.id !== id).map((c) => c.id).join(",");
    router.replace(ids ? `/compare?ids=${ids}` : "/compare", { scroll: false });
  }

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(
        (data.results ?? []).filter(
          (r: SearchResult) => !cars.some((c) => c.id === r.id)
        )
      );
    } catch {
      setResults([]);
    }
    setSearching(false);
  }

  function addCar(result: SearchResult) {
    // Navigate with the new id; the server resolves full details for every car
    const ids = [...cars.map((c) => c.id), result.id].join(",");
    router.push(`/compare?ids=${ids}`, { scroll: false });
    setShowSearch(false);
    setQuery("");
    setResults([]);
  }

  const statRows = [
    { label: "Avg Price (12mo)", key: "avgPrice12mo" as const, format: formatPrice },
    { label: "Last Sale", key: "lastSalePrice" as const, format: formatPrice },
    { label: "52-wk High", key: "high52wk" as const, format: formatPrice },
    { label: "52-wk Low", key: "low52wk" as const, format: formatPrice },
    { label: "Sales (12mo)", key: "salesCount12mo" as const, format: (v: number) => String(v) },
    { label: "Trend", key: "trendPercentage" as const, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-4">
      {/* Car headers */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(cars.length, 1)}, 1fr)` }}>
        {cars.map((car) => (
          <Card key={car.id} className="relative">
            <button
              onClick={() => removeCar(car.id)}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-sand-faint hover:text-sand hover:bg-surface-hover transition-colors"
            >
              <X size={14} />
            </button>
            <Link
              href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
              className="hover:text-forest-light transition-colors"
            >
              <div className="text-[11px] text-sand-faint">{car.make.name}</div>
              <div className="font-medium text-sand">{car.name}</div>
              <div className="text-[11px] text-sand-subtle">
                {car.yearStart}–{car.yearEnd ?? "present"}
              </div>
            </Link>
            <div className="mt-2 text-lg font-serif">
              {formatPriceShort(car.stats.avgPrice12mo)}
            </div>
            <div
              className={`text-[12px] font-medium ${
                car.stats.trendPercentage >= 0 ? "text-forest-light" : "text-maroon-light"
              }`}
            >
              {car.stats.trendPercentage >= 0 ? "+" : ""}
              {car.stats.trendPercentage.toFixed(1)}% · 12 mo
            </div>
          </Card>
        ))}
      </div>

      {/* Add car button */}
      {cars.length < 4 && (
        <div>
          {showSearch ? (
            <Card>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-faint" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search cars to compare..."
                  className="w-full pl-9 pr-3 py-2 bg-transparent text-sm text-sand placeholder:text-sand-faint outline-none border-b border-surface-border"
                  autoFocus
                />
              </div>
              {results.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-surface-border">
                  {results.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => addCar(r)}
                      className="w-full text-left px-2 py-2 hover:bg-surface-hover transition-colors rounded text-sm"
                    >
                      <span className="text-sand-muted text-[11px]">{r.make.name}</span>{" "}
                      <span className="text-sand font-medium">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && results.length === 0 && !searching && (
                <p className="text-sm text-sand-faint mt-2 px-2">No results found.</p>
              )}
              <button
                onClick={() => { setShowSearch(false); setQuery(""); setResults([]); }}
                className="mt-2 text-[12px] text-sand-faint hover:text-sand transition-colors"
              >
                Cancel
              </button>
            </Card>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border border-dashed border-surface-border text-sm text-sand-muted hover:text-sand hover:border-sand-faint transition-colors"
            >
              <Plus size={16} />
              Add car to compare
            </button>
          )}
        </div>
      )}

      {/* Comparison table */}
      {cars.length >= 2 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-[11px] uppercase tracking-wide text-sand-faint py-2 pr-4 w-36">Metric</th>
                {cars.map((car) => (
                  <th key={car.id} className="text-right text-[11px] uppercase tracking-wide text-sand-faint py-2 px-2">
                    {car.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statRows.map((row) => {
                const values = cars.map((c) => c.stats[row.key]);
                const best = Math.max(...values);

                return (
                  <tr key={row.label} className="border-b border-surface-border/50">
                    <td className="py-2.5 pr-4 text-sand-muted text-[12px]">{row.label}</td>
                    {cars.map((car) => {
                      const val = car.stats[row.key];
                      const isBest = cars.length > 1 && val === best;
                      return (
                        <td
                          key={car.id}
                          className={`py-2.5 px-2 text-right text-[13px] ${
                            isBest ? "text-forest-light font-medium" : "text-sand"
                          }`}
                        >
                          {row.format(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Year range */}
              <tr>
                <td className="py-2.5 pr-4 text-sand-muted text-[12px]">Years</td>
                {cars.map((car) => (
                  <td key={car.id} className="py-2.5 px-2 text-right text-[13px] text-sand">
                    {car.yearStart}–{car.yearEnd ?? "now"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {cars.length === 0 && (
        <Card>
          <p className="text-sm text-sand-muted text-center py-8">
            Add at least 2 cars to compare their values, trends, and market data side by side.
          </p>
        </Card>
      )}

      {cars.length === 1 && (
        <Card>
          <p className="text-sm text-sand-muted text-center py-4">
            Add one more car to start comparing.
          </p>
        </Card>
      )}
    </div>
  );
}
