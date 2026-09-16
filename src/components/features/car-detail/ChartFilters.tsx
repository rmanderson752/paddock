"use client";

import { cn } from "@/lib/utils";
import { colorFamilySwatch } from "@/lib/types";

export interface FilterState {
  mileage: string;
  color: string;
  transmission: string;
  year: string;
}

export interface ColorOption {
  /** Family key (e.g. "red") or a raw colour name for sales without details */
  value: string;
  label: string;
  count: number;
}

interface ChartFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableColors: ColorOption[];
  availableTransmissions: ("manual" | "automatic")[];
  availableYears: number[];
  totalSales: number;
  filteredSales: number;
}

const transmissionLabels = { manual: "Manual", automatic: "Automatic" } as const;

const mileageBrackets = [
  { label: "All", value: "all" },
  { label: "Under 30k", value: "under30k" },
  { label: "30k–60k", value: "30k-60k" },
  { label: "60k+", value: "60k+" },
];

function Chip({
  active,
  onClick,
  children,
  colorDot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  colorDot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] px-3 py-1.5 label-caps transition-colors shrink-0",
        active
          ? "bg-forest text-cream"
          : "border border-surface-border text-sand-subtle hover:border-surface-border-hover hover:text-sand"
      )}
    >
      {colorDot && (
        <span
          className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10"
          style={{ backgroundColor: colorDot }}
        />
      )}
      {children}
    </button>
  );
}

export function ChartFilters({
  filters,
  onChange,
  availableColors,
  availableTransmissions,
  availableYears,
  totalSales,
  filteredSales,
}: ChartFiltersProps) {
  const isFiltered =
    filters.mileage !== "all" || filters.color !== "all" || filters.transmission !== "all" || filters.year !== "all";

  return (
    <div className="py-6 space-y-4 border-b border-surface-border">
      {/* Mileage */}
      <div>
        <div className="label-caps text-sand-faint mb-2">Mileage</div>
        <div className="flex flex-wrap gap-1.5">
          {mileageBrackets.map((b) => (
            <Chip
              key={b.value}
              active={filters.mileage === b.value}
              onClick={() => onChange({ ...filters, mileage: b.value })}
            >
              {b.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Color */}
      {availableColors.length > 1 && (
        <div>
          <div className="label-caps text-sand-faint mb-2">Colour</div>
          <div className="flex flex-wrap gap-1.5 sm:overflow-x-auto sm:flex-nowrap">
            <Chip
              active={filters.color === "all"}
              onClick={() => onChange({ ...filters, color: "all" })}
            >
              All
            </Chip>
            {availableColors.map((color) => (
              <Chip
                key={color.value}
                active={filters.color === color.value}
                onClick={() => onChange({ ...filters, color: color.value })}
                colorDot={colorFamilySwatch[color.value]}
              >
                {color.label}
                <span className="opacity-60 numerals">{color.count}</span>
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Gearbox — only once the extraction pipeline has classified both kinds */}
      {availableTransmissions.length > 1 && (
        <div>
          <div className="label-caps text-sand-faint mb-2">Gearbox</div>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={filters.transmission === "all"}
              onClick={() => onChange({ ...filters, transmission: "all" })}
            >
              All
            </Chip>
            {availableTransmissions.map((t) => (
              <Chip
                key={t}
                active={filters.transmission === t}
                onClick={() => onChange({ ...filters, transmission: t })}
              >
                {transmissionLabels[t]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Year */}
      {availableYears.length > 1 && (
        <div>
          <div className="label-caps text-sand-faint mb-2">Model year</div>
          <div className="flex flex-wrap gap-1.5 sm:overflow-x-auto sm:flex-nowrap">
            <Chip
              active={filters.year === "all"}
              onClick={() => onChange({ ...filters, year: "all" })}
            >
              All
            </Chip>
            {availableYears.map((year) => (
              <Chip
                key={year}
                active={filters.year === String(year)}
                onClick={() => onChange({ ...filters, year: String(year) })}
              >
                {year}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Filter indicator */}
      {isFiltered && (
        <div className="flex items-center justify-between pt-1">
          <span className="label-caps text-sand-subtle">
            Showing {filteredSales} of {totalSales} sales
          </span>
          <button
            onClick={() => onChange({ mileage: "all", color: "all", transmission: "all", year: "all" })}
            className="label-caps text-forest hover:text-sand transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
