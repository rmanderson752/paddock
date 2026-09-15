"use client";

import { useState } from "react";
import Link from "next/link";
import { NavPill } from "@/components/ui/NavPill";
import { TrendIndicator } from "@/components/ui/TrendIndicator";
import { Card } from "@/components/ui/Card";
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
    <Card>
      <div className="flex gap-1.5 mb-4">
        <NavPill active={tab === "gainers"} onClick={() => setTab("gainers")}>
          Top Gainers
        </NavPill>
        <NavPill active={tab === "losers"} onClick={() => setTab("losers")}>
          Top Losers
        </NavPill>
      </div>
      <div className="divide-y divide-surface-border">
        {items.map((car) => (
          <Link
            key={car.id}
            href={`/car/${car.make.slug}/${car.model.slug}/${car.slug}`}
            className="flex items-center justify-between py-2.5 hover:bg-surface-hover -mx-4 px-4 sm:-mx-5 sm:px-5 transition-colors"
          >
            <div>
              <span className="text-[13px] font-medium text-sand">{car.name}</span>
              <span className="text-[12px] text-sand-subtle ml-1.5">
                {car.yearStart}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-sand">
                {formatPrice(car.stats.avgPrice12mo)}
              </span>
              <TrendIndicator value={car.stats.trendPercentage} />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
