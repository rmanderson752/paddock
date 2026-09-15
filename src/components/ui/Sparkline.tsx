import { cn } from "@/lib/utils";
import { chartColors } from "@/lib/theme";

interface SparklineProps {
  data: number[];
  trend: "positive" | "negative";
  width?: number;
  height?: number;
  className?: string;
  /** Stable id for the gradient; derived from the data when omitted */
  id?: string;
}

// Deterministic, so server and client agree (React's useId drifts when a
// client component renders directly under an async server component).
function hashOf(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function Sparkline({
  data,
  trend,
  width = 200,
  height = 36,
  className,
  id,
}: SparklineProps) {
  if (data.length < 2) return null;

  const gradientId = `sparkline-${id ?? hashOf(`${trend}:${data.join(",")}`)}`;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height * 0.85);
    return `${x},${y}`;
  });

  const strokeColor = trend === "positive" ? chartColors.positive : chartColors.negative;

  const pathD = `M${points.join(" L")}`;
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" />
    </svg>
  );
}
