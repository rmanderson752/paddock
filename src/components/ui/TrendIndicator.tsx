import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number;
  className?: string;
}

// Direction as a fine triangle, figure in tabular numerals.
export function TrendIndicator({ value, className }: TrendIndicatorProps) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.04em] numerals",
        isPositive ? "text-forest-light" : "text-maroon-light",
        className
      )}
    >
      <span className="text-[8px]">{isPositive ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
