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
    <div className="space-y-8">
      <PortfolioSummary
        totalValue={totalValue}
        totalInvested={totalInvested}
        vehicleCount={items.length}
      />

      <div className="flex items-center justify-between">
        <h2 className="label-caps text-sand">Your cars</h2>
        <div className="flex items-center gap-6">
          {items.length > 0 && (
            <a
              href="/api/portfolio/export"
              download
              className="label-caps text-sand-subtle hover:text-sand transition-colors"
            >
              Export CSV
            </a>
          )}
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            Add a car
          </Button>
        </div>
      </div>

      <PortfolioTable items={items} />

      <AddCarModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </div>
  );
}
