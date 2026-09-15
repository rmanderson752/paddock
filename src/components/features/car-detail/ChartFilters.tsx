"use client";

import { cn } from "@/lib/utils";

export interface FilterState {
  mileage: string;
  color: string;
  year: string;
}

interface ChartFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableColors: string[];
  availableYears: number[];
  totalSales: number;
  filteredSales: number;
}

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
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors shrink-0",
        active
          ? "bg-forest text-cream"
          : "border border-surface-border text-sand-subtle hover:border-surface-border-hover hover:text-sand"
      )}
    >
      {colorDot && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: colorDot }}
        />
      )}
      {children}
    </button>
  );
}

// Rough color-to-CSS mapping for chip dots
const chipColorMap: Record<string, string> = {
  "Rosso Corsa": "#CC0000", "Guards Red": "#CC0000", "Formula Red": "#CC0000",
  "Arena Red": "#A52828", "Passion Red": "#CC0000", "Brilliant Red": "#CC0000",
  "Imola Red": "#CC0000", Red: "#CC0000", "Vintage Red": "#8B0000",
  "Renaissance Red": "#B22222", "New Formula Red": "#CC0000",
  "Bayside Blue": "#3366CC", "Midnight Purple III": "#4B0082",
  "Midnight Purple": "#4B0082", "Montego Blue": "#1A3A5C",
  "Maritime Blue": "#1A3A5C", "Midnight Blue": "#191970",
  "Shark Blue": "#4477AA", Blue: "#3366CC", "Rally Blue": "#2244AA",
  "Sonic Blue Mica": "#2244AA",
  "Championship White": "#E8E8E0", "Grand Prix White": "#E8E8E0",
  "Alpine White": "#E8E8E0", White: "#E8E8E0", Bianco: "#E8E8E0",
  "Glacier White": "#E8E8E0", "Scotia White": "#E8E8E0",
  "Berlina Black": "#1A1A1A", Black: "#1A1A1A", Nero: "#1A1A1A",
  "Pyrenees Black": "#1A1A1A", "Carbon Black": "#1A1A1A",
  "Basalt Black": "#1A1A1A", "Obsidian Black": "#1A1A1A",
  Silver: "#A0A0A0", "Sonic Silver": "#A0A0A0",
  "Silverstone Metallic": "#A0A0A0", "Grigio Silverstone": "#A0A0A0",
  "Titanium Silver": "#A0A0A0", "GT Silver": "#A0A0A0",
  "Giallo Modena": "#FFD700", "Spa Yellow": "#FFD700",
  "Speed Yellow": "#FFD700", Giallo: "#FFD700",
  "Phoenix Yellow": "#FFD700",
  "Papaya Orange": "#FF6600", Orange: "#FF6600",
  "Coniston Green": "#2E5B3C", Green: "#2E5B3C",
  "Python Green": "#556B2F", "Epsom Green": "#4A7A5C",
  "Ocean Jade": "#3A7A6A", "Brooklands Green": "#2E5B3C",
  "Amethyst Metallic": "#6B3FA0", "Viola SE30": "#6B3FA0",
};

export function ChartFilters({
  filters,
  onChange,
  availableColors,
  availableYears,
  totalSales,
  filteredSales,
}: ChartFiltersProps) {
  const isFiltered = filters.mileage !== "all" || filters.color !== "all" || filters.year !== "all";

  return (
    <div className="rounded-xl border-[0.5px] border-surface-border bg-surface p-4 space-y-3">
      {/* Mileage */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.5px] text-sand-faint mb-1.5">Mileage</div>
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
          <div className="text-[10px] uppercase tracking-[0.5px] text-sand-faint mb-1.5">Color</div>
          <div className="flex flex-wrap gap-1.5 sm:overflow-x-auto sm:flex-nowrap">
            <Chip
              active={filters.color === "all"}
              onClick={() => onChange({ ...filters, color: "all" })}
            >
              All
            </Chip>
            {availableColors.map((color) => (
              <Chip
                key={color}
                active={filters.color === color}
                onClick={() => onChange({ ...filters, color })}
                colorDot={chipColorMap[color]}
              >
                {color}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Year */}
      {availableYears.length > 1 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.5px] text-sand-faint mb-1.5">Year</div>
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
          <span className="text-[11px] text-sand-subtle">
            Showing {filteredSales} of {totalSales} sales
          </span>
          <button
            onClick={() => onChange({ mileage: "all", color: "all", year: "all" })}
            className="text-[11px] text-forest-light hover:text-sand transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
