import { formatPrice } from "@/lib/utils";
import { TrendIndicator } from "@/components/ui/TrendIndicator";

interface PortfolioSummaryProps {
  totalValue: number;    // cents
  totalInvested: number; // cents
  vehicleCount: number;
}

export function PortfolioSummary({
  totalValue,
  totalInvested,
  vehicleCount,
}: PortfolioSummaryProps) {
  const gainLoss = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-xl bg-surface p-4">
        <div className="text-[11px] uppercase tracking-[0.5px] text-sand-subtle mb-1">
          Portfolio Value
        </div>
        <div className="text-2xl font-medium text-gold">
          {formatPrice(totalValue)}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <TrendIndicator value={gainPct} className="text-[13px]" />
          <span className="text-[12px] text-sand-subtle">
            ({formatPrice(Math.abs(gainLoss))})
          </span>
        </div>
      </div>
      <div className="rounded-xl bg-surface p-4">
        <div className="text-[11px] uppercase tracking-[0.5px] text-sand-subtle mb-1">
          Total Invested
        </div>
        <div className="text-2xl font-medium text-sand">
          {formatPrice(totalInvested)}
        </div>
        <div className="text-[12px] text-sand-subtle mt-1">
          {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
