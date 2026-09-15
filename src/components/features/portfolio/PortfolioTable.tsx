"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";
import { removePortfolioCar } from "@/lib/auth/portfolio-actions";
import { useState } from "react";

export interface PortfolioItem {
  id: string; // portfolio item ID (for deletion)
  car: GenerationWithDetails;
  purchasePrice: number; // cents
  year: number | null;
  notes: string | null;
}

interface PortfolioTableProps {
  items: PortfolioItem[];
}

export function PortfolioTable({ items }: PortfolioTableProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(portfolioItemId: string) {
    if (!confirm("Remove this car from your portfolio?")) return;
    setRemoving(portfolioItemId);
    await removePortfolioCar(portfolioItemId);
    setRemoving(null);
  }

  if (items.length === 0) {
    return (
      <Card>
        <p className="text-sm text-sand-subtle text-center py-6">
          No cars in your portfolio yet. Add your first car to start tracking its value.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <Card className="overflow-hidden hidden sm:block">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-0 py-2.5 text-[11px] uppercase tracking-[0.5px] text-sand-faint border-b border-surface-border">
          <div>Vehicle</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Current</div>
          <div className="text-right">Gain/Loss</div>
          <div className="w-8" />
        </div>
        <div className="divide-y divide-surface-border">
          {items.map((item) => {
            const currentPrice = item.car.stats.avgPrice12mo;
            const gain = currentPrice - item.purchasePrice;
            const isPositive = gain >= 0;

            return (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 py-3 -mx-4 px-4 sm:-mx-5 sm:px-5 items-center text-[13px] group"
              >
                <Link
                  href={`/car/${item.car.make.slug}/${item.car.model.slug}/${item.car.slug}`}
                  className="hover:text-forest-light transition-colors"
                >
                  <span className="font-medium text-sand">{item.car.name}</span>
                  {item.year && (
                    <span className="text-sand-subtle ml-1.5">{item.year}</span>
                  )}
                  {item.notes && (
                    <div className="text-[11px] text-sand-faint truncate max-w-[200px]">
                      {item.notes}
                    </div>
                  )}
                </Link>
                <div className="text-right text-sand-muted">
                  {formatPrice(item.purchasePrice)}
                </div>
                <div className="text-right text-sand-muted">
                  {formatPrice(currentPrice)}
                </div>
                <div
                  className={`text-right font-medium ${
                    isPositive ? "text-forest-light" : "text-maroon-light"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {formatPrice(gain)}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sand-faint hover:text-sand hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from portfolio"
                >
                  {removing === item.id ? (
                    <span className="text-[10px]">...</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {items.map((item) => {
          const currentPrice = item.car.stats.avgPrice12mo;
          const gain = currentPrice - item.purchasePrice;
          const isPositive = gain >= 0;
          const pct = item.purchasePrice > 0
            ? ((gain / item.purchasePrice) * 100).toFixed(1)
            : "0";

          return (
            <Card key={item.id}>
              <div className="flex items-start justify-between">
                <Link
                  href={`/car/${item.car.make.slug}/${item.car.model.slug}/${item.car.slug}`}
                  className="hover:text-forest-light transition-colors flex-1"
                >
                  <div className="text-[11px] text-sand-faint">{item.car.make.name}</div>
                  <div className="font-medium text-sand">
                    {item.car.name}
                    {item.year && (
                      <span className="text-sand-subtle ml-1.5 font-normal">{item.year}</span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removing === item.id}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sand-faint hover:text-maroon-light shrink-0"
                  title="Remove from portfolio"
                >
                  {removing === item.id ? (
                    <span className="text-[10px]">...</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex items-baseline justify-between mt-2 text-[13px]">
                <div className="text-sand-muted">
                  Paid {formatPrice(item.purchasePrice)}
                </div>
                <div className="text-right">
                  <span className="text-sand">{formatPrice(currentPrice)}</span>
                  <span
                    className={`ml-2 text-[12px] font-medium ${
                      isPositive ? "text-forest-light" : "text-maroon-light"
                    }`}
                  >
                    {isPositive ? "+" : ""}{pct}%
                  </span>
                </div>
              </div>
              {item.notes && (
                <div className="text-[11px] text-sand-faint mt-1 truncate">
                  {item.notes}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
