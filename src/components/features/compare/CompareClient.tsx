"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
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
    { label: "Twelve-month average", key: "avgPrice12mo" as const, format: formatPrice },
    { label: "Last sale", key: "lastSalePrice" as const, format: formatPrice },
    { label: "52-week high", key: "high52wk" as const, format: formatPrice },
    { label: "52-week low", key: "low52wk" as const, format: formatPrice },
    { label: "Sales, twelve months", key: "salesCount12mo" as const, format: (v: number) => String(v) },
    { label: "Trend", key: "trendPercentage" as const, format: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-4">
      {/* Car headers */}
      <div className="grid gap-px bg-surface-border border border-surface-border" style={{ gridTemplateColumns: `repeat(${Math.max(cars.length, 1)}, 1fr)` }}>
        {cars.map((car) => (
          <div key={car.id} className="relative bg-surface-page px-5 py-6">
            <button
              onClick={() => removeCar(car.id)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-sand-faint hover:text-sand transition-colors"
              aria-label={`Remove ${car.name}`}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
            <Link
              href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
              className="group block pr-8"
            >
              <div className="label-caps text-sand-subtle">{car.make.name}</div>
              <div className="display-serif text-[22px] text-sand mt-1 group-hover:underline decoration-[0.5px] underline-offset-4">{car.name}</div>
              <div className="label-caps text-sand-faint mt-2">
                {car.yearStart}–{car.yearEnd ?? "present"}
              </div>
            </Link>
            <div className="display-serif numerals text-[26px] text-sand mt-5">
              {formatPrice(car.stats.avgPrice12mo)}
            </div>
            <div
              className={`text-[12px] numerals font-medium mt-1 ${
                car.stats.trendPercentage >= 0 ? "text-forest" : "text-maroon-light"
              }`}
            >
              {car.stats.trendPercentage >= 0 ? "+" : ""}
              {car.stats.trendPercentage.toFixed(1)}% <span className="label-caps text-sand-faint ml-1">twelve months</span>
            </div>
          </div>
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
                  placeholder="Search cars to compare…"
                  className="w-full pl-8 pr-3 py-2 bg-transparent text-[14px] text-sand placeholder:text-sand-faint outline-none border-b border-surface-border focus:border-sand"
                  autoFocus
                />
              </div>
              {results.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-surface-border">
                  {results.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => addCar(r)}
                      className="w-full text-left px-2 py-2.5 hover:bg-surface-hover transition-colors"
                    >
                      <span className="label-caps text-sand-subtle mr-2">{r.make.name}</span>
                      <span className="display-serif text-[16px] text-sand">{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {query.length >= 2 && results.length === 0 && !searching && (
                <p className="label-caps text-sand-faint mt-3 px-2">No results</p>
              )}
              <button
                onClick={() => { setShowSearch(false); setQuery(""); setResults([]); }}
                className="mt-3 label-caps text-sand-faint hover:text-sand transition-colors"
              >
                Cancel
              </button>
            </Card>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center justify-center gap-2 px-4 py-4 w-full rounded-[3px] border border-dashed border-surface-border-hover label-caps text-sand-subtle hover:text-sand hover:border-sand transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} />
              Add a car to compare
            </button>
          )}
        </div>
      )}

      {/* Comparison table */}
      {cars.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left label-caps text-sand-subtle py-3 pr-4 w-40">Measure</th>
                {cars.map((car) => (
                  <th key={car.id} className="text-right label-caps text-sand-subtle py-3 px-2">
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
                  <tr key={row.label} className="border-b border-surface-border">
                    <td className="py-3.5 pr-4 label-caps text-sand-subtle">{row.label}</td>
                    {cars.map((car) => {
                      const val = car.stats[row.key];
                      const isBest = cars.length > 1 && val === best;
                      return (
                        <td
                          key={car.id}
                          className={`py-3.5 px-2 text-right display-serif numerals text-[18px] ${
                            isBest ? "text-forest" : "text-sand"
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
              <tr className="border-b border-surface-border">
                <td className="py-3.5 pr-4 label-caps text-sand-subtle">Years</td>
                {cars.map((car) => (
                  <td key={car.id} className="py-3.5 px-2 text-right numerals text-[14px] text-sand">
                    {car.yearStart}–{car.yearEnd ?? "now"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {cars.length === 0 && (
        <div className="border-y border-surface-border py-12 text-center">
          <p className="display-serif text-[20px] italic text-sand-muted">
            Add at least two cars to set their values and trends side by side.
          </p>
        </div>
      )}

      {cars.length === 1 && (
        <div className="border-y border-surface-border py-8 text-center">
          <p className="display-serif text-[18px] italic text-sand-muted">Add one more car to start comparing.</p>
        </div>
      )}
    </div>
  );
}
