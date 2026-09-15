"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

const MIN_QUERY = 2;

export function SearchDropdown() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenerationWithDetails[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Debounced fetch; state is only written from the async callback, and a
  // stale response is ignored if the query has moved on.
  useEffect(() => {
    if (query.length < MIN_QUERY) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) setResults((data.results ?? []).slice(0, 6));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDismissed(true);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const visible = query.length >= MIN_QUERY ? results : [];
  const open = visible.length > 0 && !dismissed;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setDismissed(true);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-faint"
          size={16}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDismissed(false);
          }}
          onFocus={() => setDismissed(false)}
          placeholder="Search make, model, generation..."
          aria-label="Search cars"
          className="w-full rounded-[10px] border-[0.5px] border-surface-border bg-surface py-2.5 pl-10 pr-4 text-sm text-sand placeholder:text-sand-faint outline-none transition-colors focus:border-surface-border-hover"
        />
      </form>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-[10px] border-[0.5px] border-surface-border bg-surface shadow-xl z-50 overflow-hidden">
          {visible.map((car) => (
            <button
              key={car.id}
              onClick={() => {
                setDismissed(true);
                setQuery("");
                router.push(
                  `/car/${car.make.slug}/${car.model.slug}/${car.slug}`
                );
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors border-b border-surface-border last:border-b-0 text-left"
            >
              <div>
                <div className="text-[11px] text-sand-subtle">{car.make.name}</div>
                <div className="text-[14px] font-medium text-sand">{car.name}</div>
                <div className="text-[11px] text-sand-faint mt-0.5">
                  {car.yearStart}–{car.yearEnd ?? "present"}
                  {car.chassisCode && ` · ${car.chassisCode}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-medium text-sand">
                  {formatPrice(car.stats.avgPrice12mo)}
                </div>
                <TrendIndicator value={car.stats.trendPercentage} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
