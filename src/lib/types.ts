// Shared types and constants — safe to import from both server and client components

// =============================================
// Interfaces
// =============================================

export interface Make {
  id: string;
  name: string;
  slug: string;
}

export interface Model {
  id: string;
  makeId: string;
  name: string;
  slug: string;
}

export interface Generation {
  id: string;
  modelId: string;
  name: string;
  slug: string;
  yearStart: number;
  yearEnd: number | null;
  chassisCode: string | null;
  category: string;
  description: string | null;
  imageUrl: string | null;
}

export interface Sale {
  id: string;
  generationId: string;
  salePrice: number; // cents
  saleDate: string;
  source: string;
  sourceUrl: string | null;
  year: number | null;
  mileage: number | null;
  color: string | null;
  conditionNotes: string | null;
  sold: boolean;
}

export interface ActiveListing {
  id: string;
  generationId: string;
  askingPrice: number; // cents
  listingUrl: string | null;
  source: string;
  year: number | null;
  color: string | null;
  mileage: number | null;
  conditionNotes: string | null;
  scrapedAt: string;
  isActive: boolean;
}

export interface GenerationStats {
  generationId: string;
  lastSalePrice: number;
  lastSaleDate: string;
  lastSaleSource: string;
  avgPrice12mo: number;
  high52wk: number;
  low52wk: number;
  salesCount12mo: number;
  trendDirection: "appreciating" | "stable" | "depreciating";
  trendPercentage: number;
}

export interface CategoryIndex {
  category: string;
  displayName: string;
  indexValue: number;
  changeQuarterly: number;
  modelCount: number;
}

export interface GenerationWithDetails extends Generation {
  make: Make;
  model: Model;
  stats: GenerationStats;
}

export interface MakeWithCount {
  make: Make;
  modelCount: number;
  generationCount: number;
}

// =============================================
// Constants
// =============================================

export const sourceLabels: Record<string, string> = {
  bat: "Bring a Trailer",
  cars_and_bids: "Cars & Bids",
  barrett_jackson: "Barrett-Jackson",
  mecum: "Mecum",
  rm_sothebys: "RM Sotheby's",
  bonhams: "Bonhams",
  gooding: "Gooding & Co",
  sbx: "SBX Cars",
  dupont_registry: "duPont Registry",
  hemmings: "Hemmings",
  pcarmarket: "PCAR Market",
};

export const sourceShortLabels: Record<string, string> = {
  bat: "BaT",
  cars_and_bids: "C&B",
  barrett_jackson: "Barrett-Jackson",
  mecum: "Mecum",
  rm_sothebys: "RM Sotheby's",
  bonhams: "Bonhams",
  gooding: "Gooding",
  sbx: "SBX",
  dupont_registry: "duPont",
  hemmings: "Hemmings",
  pcarmarket: "PCARMARKET",
};

export type PriceRange = "under50k" | "50k-100k" | "100k-250k" | "250k-500k" | "500k-1m" | "over1m";

export const priceRanges: { value: PriceRange; label: string; min: number; max: number }[] = [
  { value: "under50k", label: "Under $50k", min: 0, max: 5000000 },
  { value: "50k-100k", label: "$50k – $100k", min: 5000000, max: 10000000 },
  { value: "100k-250k", label: "$100k – $250k", min: 10000000, max: 25000000 },
  { value: "250k-500k", label: "$250k – $500k", min: 25000000, max: 50000000 },
  { value: "500k-1m", label: "$500k – $1M", min: 50000000, max: 100000000 },
  { value: "over1m", label: "Over $1M", min: 100000000, max: Infinity },
];

export type Era = "classic" | "modern-classic" | "modern";

export const eras: { value: Era; label: string; yearMin: number; yearMax: number }[] = [
  { value: "classic", label: "Classic (Pre-1985)", yearMin: 0, yearMax: 1984 },
  { value: "modern-classic", label: "Modern Classic (1985–2000)", yearMin: 1985, yearMax: 2000 },
  { value: "modern", label: "Modern (2001+)", yearMin: 2001, yearMax: 9999 },
];

// Supported currencies for user preference
export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF";

export const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "CHF", label: "Swiss Franc", symbol: "CHF" },
];
