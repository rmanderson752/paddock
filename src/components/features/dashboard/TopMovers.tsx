"use client";

import { useState } from "react";
import Link from "next/link";
import { NavPill } from "@/components/ui/NavPill";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { formatPrice } from "@/lib/utils";
import type { GenerationWithDetails } from "@/lib/types";

interface TopMoversProps {
  gainers: GenerationWithDetails[];
  losers: GenerationWithDetails[];
}

export function TopMovers({ gainers, losers }: TopMoversProps) {
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");
  const items = tab === "gainers" ? gainers : losers;

  return (
    <div>
      <div className="flex gap-6 mb-2">
        <NavPill active={tab === "gainers"} onClick={() => setTab("gainers")}>
          Gaining
        </NavPill>
        <NavPill active={tab === "losers"} onClick={() => setTab("losers")}>
          Softening
        </NavPill>
      </div>
      <ol className="divide-y divide-surface-border border-b border-surface-border">
        {items.map((car, i) => (
          <li key={car.id}>
            <Link
              href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
              className="flex items-center gap-4 py-3.5 group"
            >
              <span className="label-caps text-sand-faint w-5 numerals">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0">
                <div className="label-caps text-sand-subtle">{car.make.name}</div>
                <div className="display-serif text-[18px] text-sand truncate group-hover:underline decoration-[0.5px] underline-offset-4">
                  {car.name}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="display-serif numerals text-[16px] text-sand">
                  {formatPrice(car.stats.avgPrice12mo)}
                </div>
                <TrendIndicator value={car.stats.trendPercentage} />
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
