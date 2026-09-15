"use client";

import { useState } from "react";
import { PortfolioSummary } from "./PortfolioSummary";
import { PortfolioTable, type PortfolioItem } from "./PortfolioTable";
import { AddCarModal } from "./AddCarModal";
import { Button } from "@/components/ui/Button";

interface PortfolioClientProps {
  items: PortfolioItem[];
  totalValue: number;
  totalInvested: number;
}

export function PortfolioClient({ items, totalValue, totalInvested }: PortfolioClientProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <PortfolioSummary
        totalValue={totalValue}
        totalInvested={totalInvested}
        vehicleCount={items.length}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-sand">Your Cars</h2>
        <div className="flex gap-2">
          {items.length > 0 && (
            <a
              href="/api/portfolio/export"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-surface-border text-sand-muted hover:text-sand hover:bg-surface-hover transition-colors"
            >
              Export CSV
            </a>
          )}
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Add Car
          </Button>
        </div>
      </div>

      <PortfolioTable items={items} />

      <AddCarModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
