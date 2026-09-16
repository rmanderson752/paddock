"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { addPortfolioCar, type PortfolioActionResult } from "@/lib/auth/portfolio-actions";
import type { GenerationWithDetails } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface AddCarModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddCarModal({ open, onClose }: AddCarModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GenerationWithDetails[]>([]);
  const [selectedCar, setSelectedCar] = useState<GenerationWithDetails | null>(null);
  const [state, formAction, isPending] = useActionState(
    async (prevState: PortfolioActionResult | null, formData: FormData) => {
      const result = await addPortfolioCar(prevState, formData);
      if (result.success) {
        setSelectedCar(null);
        setQuery("");
        setResults([]);
        onClose();
      }
      return result;
    },
    null
  );
  const modalRef = useRef<HTMLDivElement>(null);

  // Debounced search; state is only written from the async callback and
  // stale responses are dropped once the query has moved on.
  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!cancelled) setResults((data.results ?? []).slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visibleResults = query.length >= 2 ? results : [];

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15201b]/50 backdrop-blur-sm px-4">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-[4px] border border-surface-border bg-surface-page p-7 shadow-[0_24px_64px_-24px_rgba(21,32,27,0.45)]"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="label-caps text-brass mb-1">Portfolio</div>
            <h2 className="display-serif text-[24px] text-sand">Add a car</h2>
          </div>
          <button
            onClick={onClose}
            className="text-sand-subtle hover:text-sand transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {!selectedCar ? (
          /* Step 1: Search for a car */
          <div>
            <Input
              placeholder="Search for a car (e.g. 911 Turbo, NSX, M3...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {visibleResults.length > 0 && (
              <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-surface-border border-y border-surface-border">
                {visibleResults.map((car) => (
                  <button
                    key={car.id}
                    onClick={() => {
                      setSelectedCar(car);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full text-left px-2 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <div className="display-serif text-[17px] text-sand">
                      {car.make.name} {car.name}
                    </div>
                    <div className="label-caps text-sand-subtle mt-1">
                      {car.yearStart}&ndash;{car.yearEnd ?? "present"} &middot; Avg {formatPrice(car.stats.avgPrice12mo)}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && visibleResults.length === 0 && (
              <p className="mt-4 label-caps text-sand-subtle text-center">No cars found</p>
            )}
          </div>
        ) : (
          /* Step 2: Enter purchase details */
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="generationId" value={selectedCar.id} />

            {/* Selected car display */}
            <div className="flex items-center justify-between border-y border-surface-border py-3">
              <div>
                <div className="display-serif text-[18px] text-sand">
                  {selectedCar.make.name} {selectedCar.name}
                </div>
                <div className="label-caps text-sand-subtle mt-1">
                  {selectedCar.yearStart}&ndash;{selectedCar.yearEnd ?? "present"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCar(null)}
                className="label-caps text-forest hover:text-sand transition-colors"
              >
                Change
              </button>
            </div>

            {state?.error && (
              <div className="rounded-[3px] bg-maroon-muted px-4 py-3 text-[13px] text-sand">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="purchasePrice" className="block label-caps text-sand-subtle mb-2">
                Purchase Price (USD)
              </label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 85000"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="year" className="block label-caps text-sand-subtle mb-2">
                  Model Year
                </label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min={selectedCar.yearStart}
                  max={selectedCar.yearEnd ?? new Date().getFullYear()}
                  placeholder={String(selectedCar.yearStart)}
                />
              </div>
              <div>
                <label htmlFor="purchaseDate" className="block label-caps text-sand-subtle mb-2">
                  Purchase Date
                </label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block label-caps text-sand-subtle mb-2">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={500}
                placeholder="Color, condition, mods..."
                className="w-full rounded-[3px] border border-surface-border bg-surface-page px-4 py-3 text-[15px] text-sand placeholder:text-sand-faint outline-none transition-colors focus:border-sand resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Adding…" : "Add to portfolio"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
