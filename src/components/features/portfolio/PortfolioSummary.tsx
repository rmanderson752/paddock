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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-6 border-b border-surface-border pb-8">
      <div>
        <div className="label-caps text-sand-subtle mb-2">Market value</div>
        <div className="display-serif numerals text-[40px] text-sand leading-none">
          {formatPrice(totalValue)}
        </div>
      </div>
      <div>
        <div className="label-caps text-sand-subtle mb-2">Invested</div>
        <div className="display-serif numerals text-[40px] text-sand-muted leading-none">
          {formatPrice(totalInvested)}
        </div>
      </div>
      <div>
        <div className="label-caps text-sand-subtle mb-2">Unrealised</div>
        <div className={`display-serif numerals text-[40px] leading-none ${gainLoss >= 0 ? "text-forest" : "text-maroon-light"}`}>
          {gainLoss >= 0 ? "+" : "−"}{formatPrice(Math.abs(gainLoss))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <TrendIndicator value={gainPct} />
          <span className="label-caps text-sand-faint">
            {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
