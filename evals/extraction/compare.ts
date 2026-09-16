/**
 * Side-by-side table of every extraction eval run in results/ — one row per
 * run, headline metrics only. The per-case detail stays in each run's JSON.
 *
 * Usage:
 *   npm run eval:compare                 # console table
 *   npm run eval:compare -- --markdown   # paste into README.md
 */

import * as fs from "fs";
import * as path from "path";

interface Run {
  stamp: string;
  model: string;
  effort: string | null;
  promptVersion: string;
  set: string;
  cases: number;
  failures: unknown[];
  metrics: {
    coreScore: number;
    fields: { field: string; accuracy: number }[];
    flags: { f1: number | null; exactSetAccuracy: number } | null;
    summary: { n: number; withinLength: number; atMostTwoSentences: number; numbersGrounded: number };
  };
  cost: { perCaseUsd: number; totalUsd: number; cacheHitRate: number };
  latency: { p50Ms: number; p95Ms: number };
}

const resultsDir = path.join(__dirname, "results");
const markdown = process.argv.includes("--markdown");

const runs: Run[] = fs
  .readdirSync(resultsDir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("predictions-"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(resultsDir, f), "utf8")) as Run)
  .sort((a, b) => a.stamp.localeCompare(b.stamp));

if (runs.length === 0) {
  console.log("no runs in evals/extraction/results — run npm run eval:extraction first");
  process.exit(0);
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`);
const acc = (r: Run, field: string) => pct(r.metrics.fields.find((f) => f.field === field)?.accuracy);
const label = (r: Run) => `${r.model.replace("claude-", "")}${r.effort ? ` / ${r.effort}` : ""}`;

const columns: { header: string; cell: (r: Run) => string }[] = [
  { header: "Run", cell: (r) => r.stamp.slice(0, 10) },
  { header: "Model / effort", cell: label },
  { header: "Prompt", cell: (r) => r.promptVersion },
  { header: "Cases", cell: (r) => `${r.cases}${r.failures.length ? ` (${r.failures.length} failed)` : ""}` },
  { header: "Core", cell: (r) => pct(r.metrics.coreScore) },
  { header: "Flags F1", cell: (r) => pct(r.metrics.flags?.f1) },
  { header: "Mileage", cell: (r) => acc(r, "mileage") },
  { header: "TMU", cell: (r) => acc(r, "mileage_tmu") },
  { header: "Colour", cell: (r) => acc(r, "color_family") },
  { header: "Gearbox", cell: (r) => acc(r, "transmission") },
  { header: "Title", cell: (r) => acc(r, "title_status") },
  { header: "Summary ok", cell: (r) => `${r.metrics.summary.numbersGrounded}/${r.metrics.summary.n}` },
  { header: "$/case", cell: (r) => `$${r.cost.perCaseUsd.toFixed(4)}` },
  { header: "Cache", cell: (r) => pct(r.cost.cacheHitRate) },
  { header: "p50", cell: (r) => `${(r.latency.p50Ms / 1000).toFixed(1)}s` },
  { header: "p95", cell: (r) => `${(r.latency.p95Ms / 1000).toFixed(1)}s` },
];

const rows = runs.map((r) => columns.map((c) => c.cell(r)));

if (markdown) {
  console.log(`| ${columns.map((c) => c.header).join(" | ")} |`);
  console.log(`| ${columns.map(() => "---").join(" | ")} |`);
  for (const row of rows) console.log(`| ${row.join(" | ")} |`);
} else {
  const widths = columns.map((c, i) => Math.max(c.header.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((v, i) => v.padEnd(widths[i])).join("  ");
  console.log(line(columns.map((c) => c.header)));
  console.log(widths.map((w) => "─".repeat(w)).join("  "));
  for (const row of rows) console.log(line(row));
}
