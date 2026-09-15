"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { chartColors } from "@/lib/theme";

interface SparklineProps {
  data: number[];
  trend: "positive" | "negative";
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  trend,
  width = 200,
  height = 36,
  className,
}: SparklineProps) {
  // Hooks must run unconditionally — before the empty-data early return
  const reactId = useId();
  const gradientId = `sparkline-gradient-${reactId}`;

  if (data.length < 2) return null;

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
