import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number;
  className?: string;
}

export function TrendIndicator({ value, className }: TrendIndicatorProps) {
  const isPositive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        isPositive ? "text-forest-light" : "text-maroon-light",
        className
      )}
    >
      {isPositive ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
