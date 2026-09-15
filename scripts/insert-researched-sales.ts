// One-time script to insert web-researched auction results for cars with zero BaT data
// Run: npx tsx scripts/insert-researched-sales.ts

import { randomUUID } from "crypto";
import { client, batchWrite, dbReady } from "../src/lib/db";
import { refreshAllStats } from "../src/lib/stats";
import type { InStatement } from "@libsql/client";

async function genIdBySlug(slug: string): Promise<string> {
  const res = await client.execute({ sql: "SELECT id FROM generations WHERE slug = ?", args: [slug] });
  const id = res.rows[0]?.id;
  if (!id) throw new Error(`Generation not found for slug "${slug}" — run the seed first`);
  return String(id);
}

// Resolved in main(); the sale list below refers to these keys
const GENERATION_IDS: Record<"f40" | "f1" | "22b", string> = { f40: "", f1: "", "22b": "" };

interface SaleInput {
  generationId: keyof typeof GENERATION_IDS;
  salePrice: number; // USD whole dollars — converted to cents on insert
  saleDate: string;
  source: string;
  sourceUrl: string | null;
  year: number | null;
  mileage: number | null;
  color: string | null;
  conditionNotes: string | null;
  sold: boolean;
}

const sales: SaleInput[] = [
  // ===== Ferrari F40 =====
  {
    generationId: "f40",
    salePrice: 5830000,
    saleDate: "2026-01-11",
    source: "mecum",
    sourceUrl: null,
    year: 1992,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "Mecum Kissimmee 2026",
    sold: true,
  },
  {
    generationId: "f40",
    salePrice: 3200000, // estimated from RM Sotheby's Arizona Jan 2026
    saleDate: "2026-01-24",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1991,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "RM Sotheby's Arizona 2026",
    sold: true,
  },
  {
    generationId: "f40",
    salePrice: 3085000,
    saleDate: "2025-08-15",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1990,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "RM Sotheby's Monterey 2025",
    sold: true,
  },
  {
    generationId: "f40",
    salePrice: 3050000, // €2,817,500 converted at ~1.08
    saleDate: "2025-05-20",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1989,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "RM Sotheby's Milan 2025. Sold for €2,817,500",
    sold: true,
  },
  {
    generationId: "f40",
    salePrice: 3360000,
    saleDate: "2024-11-30",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1990,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "RM Sotheby's Miami 2024",
    sold: true,
  },
  {
    generationId: "f40",
    salePrice: 3470000,
    saleDate: "2024-09-14",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1990,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "RM Sotheby's Toronto 2024",
    sold: true,
  },
  {
    generationId: "f40",
    salePrice: 3410000,
    saleDate: "2024-01-13",
    source: "mecum",
    sourceUrl: null,
    year: 1992,
    mileage: null,
    color: "Rosso Corsa",
    conditionNotes: "Mecum Kissimmee 2024",
    sold: true,
  },

  // ===== McLaren F1 =====
  {
    generationId: "f1",
    salePrice: 25317500,
    saleDate: "2025-11-30",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1994,
    mileage: null,
    color: null,
    conditionNotes: "Chassis 014. RM Sotheby's Abu Dhabi 2025. Highest price paid for an F1 at auction.",
    sold: true,
  },
  {
    generationId: "f1",
    salePrice: 20465000,
    saleDate: "2024-08-17",
    source: "gooding",
    sourceUrl: null,
    year: 1995,
    mileage: null,
    color: "Papaya Orange",
    conditionNotes: "Gooding & Company Pebble Beach 2024. Chassis 029.",
    sold: true,
  },
  {
    generationId: "f1",
    salePrice: 19805000,
    saleDate: "2023-08-19",
    source: "gooding",
    sourceUrl: null,
    year: 1994,
    mileage: null,
    color: null,
    conditionNotes: "Gooding & Company Pebble Beach 2023. Chassis 044.",
    sold: true,
  },
  {
    generationId: "f1",
    salePrice: 15620000,
    saleDate: "2022-08-20",
    source: "gooding",
    sourceUrl: null,
    year: 1995,
    mileage: 390,
    color: "Creighton Brown",
    conditionNotes: "Gooding & Company Pebble Beach 2022. Chassis 029. Only 390 km.",
    sold: true,
  },

  // ===== Subaru 22B STI =====
  {
    generationId: "22b",
    salePrice: 480500,
    saleDate: "2023-08-26",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1998,
    mileage: null,
    color: "Sonic Blue",
    conditionNotes: "Colin McRae's personal car. RM Sotheby's Monterey 2023. Final price ~$604k with premium.",
    sold: true,
  },
  {
    generationId: "22b",
    salePrice: 312555,
    saleDate: "2023-06-15",
    source: "bat",
    sourceUrl: null,
    year: 1998,
    mileage: 6200,
    color: "Sonic Blue",
    conditionNotes: "Bring a Trailer 2023. Low mileage example, #310/424.",
    sold: true,
  },
  {
    generationId: "22b",
    salePrice: 226000,
    saleDate: "2023-03-10",
    source: "bat",
    sourceUrl: null,
    year: 1998,
    mileage: 115000,
    color: "Sonic Blue",
    conditionNotes: "Bring a Trailer. Higher mileage example, 115k miles.",
    sold: true,
  },
  {
    generationId: "22b",
    salePrice: 131555,
    saleDate: "2024-06-20",
    source: "bat",
    sourceUrl: null,
    year: 1998,
    mileage: null,
    color: "Sonic Blue",
    conditionNotes: "Bring a Trailer June 2024.",
    sold: true,
  },
  {
    generationId: "22b",
    salePrice: 275000,
    saleDate: "2024-11-10",
    source: "rm_sothebys",
    sourceUrl: null,
    year: 1998,
    mileage: 28000,
    color: "Sonic Blue",
    conditionNotes: "RM Sotheby's 2024. Clean example, 28k miles.",
    sold: true,
  },
];

async function main() {
  await dbReady();
  GENERATION_IDS.f40 = await genIdBySlug("f40");
  GENERATION_IDS.f1 = await genIdBySlug("f1");
  GENERATION_IDS["22b"] = await genIdBySlug("22b-sti");

  const statements: InStatement[] = sales.map((s) => ({
    sql: `INSERT INTO sales (id, generation_id, sale_price, sale_date, source, source_url, year, mileage, color, condition_notes, sold)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      GENERATION_IDS[s.generationId],
      s.salePrice * 100, // Convert dollars to cents
      s.saleDate,
      s.source,
      s.sourceUrl,
      s.year,
      s.mileage,
      s.color,
      s.conditionNotes,
      s.sold ? 1 : 0,
    ],
  }));
  await batchWrite(statements);
  console.log(`Inserted ${sales.length} sales records.`);

  // Recompute stats and indices for everything (shared with the app + scraper)
  const summary = await refreshAllStats();
  console.log(
    `Stats refreshed as of ${summary.asOf}: ${summary.generationsUpdated} generations, ${summary.categories} categories`
  );
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
