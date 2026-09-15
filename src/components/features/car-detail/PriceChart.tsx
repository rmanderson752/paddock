"use client";

import { useState, useMemo, useId } from "react";
import {
  ComposedChart,
  Area,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { NavPill } from "@/components/ui/NavPill";
import { Card } from "@/components/ui/Card";
import { formatPrice, formatPriceShort, formatDate } from "@/lib/utils";
import { sourceLabels } from "@/lib/types";
import { chartColors } from "@/lib/theme";
import { shiftIsoDate } from "@/lib/stats-core";
import type { GenerationStats, Sale, ActiveListing } from "@/lib/types";

interface PriceChartProps {
  stats: GenerationStats;
  allSales: Sale[];
  activeListings: ActiveListing[];
  filteredSales?: Sale[];
  /** The date the dataset runs through — timeframes are measured back from here */
  asOf: string;
}

const timeframes = [
  { label: "1Y", years: 1 },
  { label: "3Y", years: 3 },
  { label: "5Y", years: 5 },
  { label: "All", years: 0 },
] as const;

interface ChartDataPoint {
  ts: number;
  date: string;
  price?: number;
  listingPrice?: number;
  source: string;
  mileage?: number | null;
  color?: string | null;
  conditionNotes?: string | null;
  isListing?: boolean;
}

function toTs(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}

// Custom dot for each sold sale
function SaleDot(props: Record<string, unknown>) {
  const { cx, cy } = props as { cx?: number; cy?: number };
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={chartColors.panel}
      stroke={chartColors.positive}
      strokeWidth={1.5}
    />
  );
}

// Diamond for active listings
function ListingDot(props: Record<string, unknown>) {
  const { cx, cy } = props as { cx?: number; cy?: number };
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  return (
    <g transform={`translate(${cx},${cy}) rotate(45)`}>
      <rect
        x={-4}
        y={-4}
        width={8}
        height={8}
        fill={chartColors.gold}
        stroke={chartColors.goldLight}
        strokeWidth={1}
      />
    </g>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  const price = entry.price ?? entry.listingPrice ?? 0;

  return (
    <div className="rounded-lg border-[0.5px] border-surface-border bg-forest-dark px-3 py-2 shadow-xl">
      <div className="text-[11px] text-sand-subtle">{formatDate(entry.date)}</div>
      <div className="text-[16px] font-serif text-sand">
        {formatPrice(price)}
      </div>
      <div className="text-[11px] text-sand-faint mt-0.5">
        {sourceLabels[entry.source] ?? entry.source}
        {entry.isListing && (
          <span className="text-gold ml-1">· Asking</span>
        )}
      </div>
      {entry.mileage && (
        <div className="text-[10px] text-sand-faint">
          {entry.mileage.toLocaleString()} mi
          {entry.color && ` · ${entry.color}`}
        </div>
      )}
      {entry.conditionNotes && (
        <div className="text-[10px] text-sand-faint italic mt-0.5 max-w-[260px]">
          {entry.conditionNotes}
        </div>
      )}
    </div>
  );
}

/** First-of-month ticks across the visible range, thinned to roughly `max` labels. */
function monthTicks(minTs: number, maxTs: number, max = 6): number[] {
  const ticks: number[] = [];
  const d = new Date(minTs);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  if (d.getTime() < minTs) d.setUTCMonth(d.getUTCMonth() + 1);
  while (d.getTime() <= maxTs) {
    ticks.push(d.getTime());
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  const step = Math.max(1, Math.ceil(ticks.length / max));
  return ticks.filter((_, i) => i % step === 0);
}

export function PriceChart({ stats, allSales: propAllSales, activeListings, filteredSales, asOf }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<string>("1Y");
  const isPositive = stats.trendDirection !== "depreciating";
  const gradientId = useId();

  const { data, ticks, domain } = useMemo(() => {
    const tf = timeframes.find((t) => t.label === timeframe) ?? timeframes[0];
    const baseSales = filteredSales ?? propAllSales;
    const sales = tf.years
      ? baseSales.filter((s) => s.saleDate >= shiftIsoDate(asOf, { years: -tf.years }))
      : baseSales;

    const salePoints: ChartDataPoint[] = sales.map((s) => ({
      ts: toTs(s.saleDate),
      date: s.saleDate,
      price: s.salePrice,
      source: s.source,
      mileage: s.mileage,
      color: s.color,
      conditionNotes: s.conditionNotes,
      isListing: false,
    }));

    const listingPoints: ChartDataPoint[] = activeListings.map((l) => ({
      ts: toTs(asOf),
      date: asOf,
      listingPrice: l.askingPrice,
      source: l.source,
      mileage: l.mileage,
      color: l.color,
      conditionNotes: null,
      isListing: true,
    }));

    const points = [...salePoints, ...listingPoints].sort((a, b) => a.ts - b.ts);
    const minTs = points.length
      ? Math.min(points[0].ts, tf.years ? toTs(shiftIsoDate(asOf, { years: -tf.years })) : points[0].ts)
      : toTs(asOf);
    const maxTs = toTs(asOf);

    return {
      data: points,
      ticks: monthTicks(minTs, maxTs),
      domain: [minTs, maxTs] as [number, number],
    };
  }, [timeframe, filteredSales, propAllSales, activeListings, asOf]);

  const strokeColor = isPositive ? chartColors.positive : chartColors.negative;
  const hasListings = data.some((d) => d.isListing);
  const soldCount = data.filter((d) => !d.isListing).length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-1.5">
          {timeframes.map((tf) => (
            <NavPill
              key={tf.label}
              active={timeframe === tf.label}
              onClick={() => setTimeframe(tf.label)}
            >
              {tf.label}
            </NavPill>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-forest-light" />
            <span className="text-[10px] text-sand-subtle">
              Sold{soldCount > 0 && ` · ${soldCount}`}
            </span>
          </div>
          {hasListings && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rotate-45 bg-gold" />
              <span className="text-[10px] text-sand-subtle">Listed</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[200px] sm:h-[280px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-sand-subtle">
            No completed sales in this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient
                  id={`cg-${gradientId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={domain}
                ticks={ticks}
                tick={{ fill: chartColors.tick, fontSize: 10 }}
                axisLine={{ stroke: chartColors.axis }}
                tickLine={false}
                tickFormatter={(v: number) => {
                  const d = new Date(v);
                  return `${d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} '${String(d.getUTCFullYear()).slice(2)}`;
                }}
              />
              <YAxis
                tick={{ fill: chartColors.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatPriceShort(v)}
                width={55}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: chartColors.axis, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#cg-${gradientId})`}
                dot={<SaleDot />}
                activeDot={{
                  r: 5,
                  fill: strokeColor,
                  stroke: chartColors.panelDeep,
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                connectNulls
              />
              <Scatter
                dataKey="listingPrice"
                fill={chartColors.gold}
                shape={<ListingDot />}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 text-right text-[10px] text-sand-faint">
        Data through {formatDate(asOf)}
      </div>
    </Card>
  );
}
