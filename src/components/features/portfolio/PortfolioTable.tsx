"use client";

import Link from "next/link";
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
      <div className="border-y border-surface-border py-12 text-center">
        <p className="display-serif text-[20px] italic text-sand-muted">Nothing in the portfolio yet.</p>
        <p className="mt-3 text-[13px] text-sand-subtle">Add your first car to follow its value against what you paid.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 py-2.5 label-caps text-sand-subtle border-b border-surface-border">
          <div>Vehicle</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Market</div>
          <div className="text-right">Unrealised</div>
          <div className="w-8" />
        </div>
        <div className="divide-y divide-surface-border border-b border-surface-border">
          {items.map((item) => {
            const currentPrice = item.car.stats.avgPrice12mo;
            const gain = currentPrice - item.purchasePrice;
            const isPositive = gain >= 0;

            return (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 py-4 items-center group"
              >
                <Link
                  href={`/car/${item.car.make.slug}/${item.car.model.slug}/${item.car.slug}`}
                  className="min-w-0"
                >
                  <div className="label-caps text-sand-subtle">
                    {item.car.make.name}{item.year ? ` · ${item.year}` : ""}
                  </div>
                  <div className="display-serif text-[20px] text-sand truncate mt-0.5 group-hover:underline decoration-[0.5px] underline-offset-4">
                    {item.car.name}
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-sand-faint truncate max-w-[260px] mt-1">
                      {item.notes}
                    </div>
                  )}
                </Link>
                <div className="text-right numerals text-[14px] text-sand-muted">
                  {formatPrice(item.purchasePrice)}
                </div>
                <div className="text-right display-serif numerals text-[18px] text-sand">
                  {formatPrice(currentPrice)}
                </div>
                <div
                  className={`text-right numerals text-[14px] font-medium ${
                    isPositive ? "text-forest" : "text-maroon-light"
                  }`}
                >
                  {isPositive ? "+" : "−"}
                  {formatPrice(Math.abs(gain))}
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
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-surface-border border-y border-surface-border sm:hidden">
        {items.map((item) => {
          const currentPrice = item.car.stats.avgPrice12mo;
          const gain = currentPrice - item.purchasePrice;
          const isPositive = gain >= 0;
          const pct = item.purchasePrice > 0
            ? ((gain / item.purchasePrice) * 100).toFixed(1)
            : "0";

          return (
            <div key={item.id} className="py-4">
              <div className="flex items-start justify-between">
                <Link
                  href={`/car/${item.car.make.slug}/${item.car.model.slug}/${item.car.slug}`}
                  className="hover:text-forest-light transition-colors flex-1"
                >
                  <div className="label-caps text-sand-subtle">
                    {item.car.make.name}{item.year ? ` · ${item.year}` : ""}
                  </div>
                  <div className="display-serif text-[20px] text-sand mt-0.5">{item.car.name}</div>
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
              <div className="flex items-baseline justify-between mt-3">
                <div className="label-caps text-sand-subtle numerals">Paid {formatPrice(item.purchasePrice)}</div>
                <div className="text-right">
                  <span className="display-serif numerals text-[18px] text-sand">{formatPrice(currentPrice)}</span>
                  <span
                    className={`ml-2 text-[12px] numerals font-medium ${
                      isPositive ? "text-forest" : "text-maroon-light"
                    }`}
                  >
                    {isPositive ? "+" : ""}{pct}%
                  </span>
                </div>
              </div>
              {item.notes && (
                <div className="text-[11px] text-sand-faint mt-1.5 truncate">
                  {item.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
