/**
 * Extraction eval — runs the listing extractor over labelled cases and
 * reports per-field accuracy, precision/recall, flag F1, summary
 * faithfulness, cost and latency. See README.md in this directory.
 *
 * Usage:
 *   npx tsx evals/extraction/run.ts                          # every case, default model
 *   npx tsx evals/extraction/run.ts --model claude-sonnet-5 --effort medium
 *   npx tsx evals/extraction/run.ts --set synthetic          # only the in-repo cases (no database needed)
 *   npx tsx evals/extraction/run.ts --limit 10 --concurrency 2
 *   npx tsx evals/extraction/run.ts --dry                    # validate cases and resolve inputs, no API calls
 *   npx tsx evals/extraction/run.ts --predictions results/predictions-<stamp>.jsonl   # regrade a saved run
 *   npx tsx evals/extraction/run.ts --bootstrap 30           # draft labels for unlabelled listings (review before committing!)
 *
 * Results land in results/<stamp>-<model>[-effort].json and a per-case
 * predictions file next to it. Needs ANTHROPIC_API_KEY unless --dry or
 * --predictions.
 */

import "../../scripts/env";
import * as fs from "fs";
import * as path from "path";
import {
  extractListing,
  getExtractionInputsByUrls,
  getPendingSales,
  isConfigured,
  resolveModel,
  ExtractionError,
  ExtractedListingSchema,
  PROMPT_VERSION,
  type Effort,
  type ExtractedListing,
  type ExtractionInput,
  type ExtractionResult,
} from "../../src/lib/extraction";
import { aggregate, gradeCase, type Aggregate, type CaseGrade, type ExpectedListing } from "../../src/lib/extraction/grade";

// ─── CLI ─────────────────────────────────────────────────────────────
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && !process.argv[i + 1]?.startsWith("--") ? process.argv[i + 1] : undefined;
}

const here = __dirname;
const casesDir = path.join(here, "cases");
const resultsDir = path.join(here, "results");

// ─── Cases ───────────────────────────────────────────────────────────
interface EvalCase {
  id: string;
  /** In-repo input (synthetic cases) … */
  input?: ExtractionInput;
  /** … or a real listing whose text lives in the database */
  source_url?: string;
  expected: ExpectedListing;
  notes?: string;
  set: string;
}

function readJsonl<T>(file: string): T[] {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trimStart().startsWith("//"))
    .map((l) => JSON.parse(l) as T);
}

function loadCases(set: string): EvalCase[] {
  const files = fs.readdirSync(casesDir).filter((f) => f.endsWith(".jsonl"));
  const chosen = set === "all" ? files : files.filter((f) => f.replace(/\.jsonl$/, "") === set);
  if (chosen.length === 0) throw new Error(`No case file for --set ${set} (have: ${files.join(", ")})`);
  const cases: EvalCase[] = [];
  for (const f of chosen) {
    const setName = f.replace(/\.jsonl$/, "");
    for (const c of readJsonl<Omit<EvalCase, "set">>(path.join(casesDir, f))) cases.push({ ...c, set: setName });
  }
  const ids = new Set<string>();
  for (const c of cases) {
    if (ids.has(c.id)) throw new Error(`Duplicate case id ${c.id}`);
    ids.add(c.id);
    if (!c.input && !c.source_url) throw new Error(`Case ${c.id} has neither input nor source_url`);
    // Labels must be schema-valid values for the fields they assert
    const partial = ExtractedListingSchema.partial().omit({ summary: true }).strict().safeParse(c.expected);
    if (!partial.success) throw new Error(`Case ${c.id} has an invalid label: ${partial.error.message}`);
  }
  return cases;
}

/** Fill in inputs for database-backed cases. */
async function resolveInputs(cases: EvalCase[]): Promise<{ resolved: (EvalCase & { input: ExtractionInput })[]; missing: string[] }> {
  const urls = cases.filter((c) => !c.input && c.source_url).map((c) => c.source_url!);
  const fromDb = urls.length ? await getExtractionInputsByUrls(urls) : new Map();
  const resolved: (EvalCase & { input: ExtractionInput })[] = [];
  const missing: string[] = [];
  for (const c of cases) {
    if (c.input) {
      resolved.push({ ...c, input: c.input });
      continue;
    }
    const hit = fromDb.get(c.source_url!);
    if (!hit || hit.textSource !== "listing_page") {
      missing.push(c.id);
      continue;
    }
    resolved.push({ ...c, input: hit.input });
  }
  return { resolved, missing };
}

// ─── Running ─────────────────────────────────────────────────────────
interface Prediction {
  id: string;
  set: string;
  ok: boolean;
  error?: string;
  errorKind?: string;
  output?: ExtractedListing;
  usage?: ExtractionResult["usage"];
  costUsd?: number | null;
  latencyMs?: number;
}

async function runModel(
  cases: (EvalCase & { input: ExtractionInput })[],
  model: string,
  effort: Effort | undefined,
  concurrency: number
): Promise<Prediction[]> {
  const predictions: Prediction[] = new Array(cases.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < cases.length) {
      const i = next++;
      const c = cases[i];
      try {
        const r = await extractListing(c.input, { model, effort });
        predictions[i] = { id: c.id, set: c.set, ok: true, output: r.data, usage: r.usage, costUsd: r.costUsd, latencyMs: r.latencyMs };
      } catch (err) {
        const kind = err instanceof ExtractionError ? err.kind : "api_error";
        predictions[i] = { id: c.id, set: c.set, ok: false, error: err instanceof Error ? err.message : String(err), errorKind: kind };
      }
      done++;
      process.stdout.write(`\r  ${done}/${cases.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, cases.length) }, worker));
  process.stdout.write("\n");
  return predictions;
}

// ─── Reporting ───────────────────────────────────────────────────────
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "  —  " : `${(v * 100).toFixed(1).padStart(5)}%`);
const percentile = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

interface RunSummary {
  stamp: string;
  model: string;
  effort: Effort | null;
  promptVersion: string;
  set: string;
  cases: number;
  failures: { id: string; kind: string; error: string }[];
  metrics: Aggregate;
  bySet: Record<string, Aggregate>;
  cost: { totalUsd: number; perCaseUsd: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; cacheHitRate: number };
  latency: { p50Ms: number; p95Ms: number; meanMs: number };
}

function printReport(s: RunSummary) {
  const m = s.metrics;
  console.log(`\n${"═".repeat(72)}`);
  console.log(`Extraction eval — ${s.model}${s.effort ? ` (effort ${s.effort})` : ""} — prompt ${s.promptVersion} — set ${s.set}`);
  console.log(`${s.cases} cases, ${s.failures.length} failed calls · core score ${pct(m.coreScore)}`);
  console.log("─".repeat(72));
  console.log(`${"field".padEnd(20)} ${"n".padStart(3)}  ${"acc".padStart(6)}  ${"prec".padStart(6)}  ${"rec".padStart(6)}  wrong   FP   FN`);
  for (const f of m.fields) {
    console.log(
      `${f.field.padEnd(20)} ${String(f.n).padStart(3)}  ${pct(f.accuracy)}  ${pct(f.precision)}  ${pct(f.recall)}  ${String(f.wrongValue).padStart(5)} ${String(f.falsePositive).padStart(4)} ${String(f.falseNegative).padStart(4)}`
    );
  }
  if (m.flags) {
    console.log(`${"flags (micro)".padEnd(20)} ${String(m.flags.n).padStart(3)}  ${pct(m.flags.exactSetAccuracy)}  ${pct(m.flags.precision)}  ${pct(m.flags.recall)}   F1 ${pct(m.flags.f1)}`);
    for (const pf of m.flags.perFlag) {
      if (pf.tp + pf.fp + pf.fn === 0) continue;
      console.log(`  ${pf.flag.padEnd(28)} tp ${String(pf.tp).padStart(3)} fp ${String(pf.fp).padStart(3)} fn ${String(pf.fn).padStart(3)}  prec ${pct(pf.precision)} rec ${pct(pf.recall)}`);
    }
  }
  for (const l of m.lists) {
    console.log(`${(l.field + " (soft)").padEnd(20)} ${String(l.n).padStart(3)}    —     ${pct(l.precision)}  ${pct(l.recall)}`);
  }
  const su = m.summary;
  console.log(
    `summary: ≤220 chars ${su.withinLength}/${su.n} · ≤2 sentences ${su.atMostTwoSentences}/${su.n} · no price ${su.noPrice}/${su.n} · numbers grounded ${su.numbersGrounded}/${su.n} · mean ${Math.round(su.meanLength)} chars`
  );
  console.log("─".repeat(72));
  console.log(
    `cost $${s.cost.totalUsd.toFixed(4)} total, $${s.cost.perCaseUsd.toFixed(4)}/case · tokens in ${s.cost.inputTokens} / cached ${s.cost.cacheReadTokens} / out ${s.cost.outputTokens} · cache hit ${pct(s.cost.cacheHitRate)}`
  );
  console.log(`latency p50 ${s.latency.p50Ms} ms · p95 ${s.latency.p95Ms} ms · mean ${Math.round(s.latency.meanMs)} ms`);
  if (Object.keys(s.bySet).length > 1) {
    for (const [set, agg] of Object.entries(s.bySet)) console.log(`  ${set}: ${agg.cases} cases, core score ${pct(agg.coreScore)}`);
  }
  if (s.failures.length) {
    console.log("failed calls:");
    for (const f of s.failures) console.log(`  ${f.id} — ${f.kind}: ${f.error.slice(0, 120)}`);
  }
}

function summarize(
  cases: (EvalCase & { input: ExtractionInput })[],
  predictions: Prediction[],
  model: string,
  effort: Effort | undefined,
  set: string,
  stamp: string
): { summary: RunSummary; perCase: { id: string; set: string; grade: CaseGrade | null }[] } {
  const grades: CaseGrade[] = [];
  const bySet = new Map<string, CaseGrade[]>();
  const perCase: { id: string; set: string; grade: CaseGrade | null }[] = [];
  const failures: RunSummary["failures"] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const p = predictions[i];
    if (!p?.ok || !p.output) {
      failures.push({ id: c.id, kind: p?.errorKind ?? "missing", error: p?.error ?? "no prediction" });
      perCase.push({ id: c.id, set: c.set, grade: null });
      continue;
    }
    const g = gradeCase(c.expected, p.output, c.input);
    grades.push(g);
    bySet.set(c.set, [...(bySet.get(c.set) ?? []), g]);
    perCase.push({ id: c.id, set: c.set, grade: g });
  }
  const ok = predictions.filter((p) => p?.ok);
  const sum = (f: (p: Prediction) => number) => ok.reduce((a, p) => a + f(p), 0);
  const inputTokens = sum((p) => p.usage?.inputTokens ?? 0);
  const cacheRead = sum((p) => p.usage?.cacheReadTokens ?? 0);
  const cacheWrite = sum((p) => p.usage?.cacheWriteTokens ?? 0);
  const latencies = ok.map((p) => p.latencyMs ?? 0).filter((x) => x > 0);
  const totalUsd = sum((p) => p.costUsd ?? 0);
  const summary: RunSummary = {
    stamp,
    model,
    effort: effort ?? null,
    promptVersion: PROMPT_VERSION,
    set,
    cases: cases.length,
    failures,
    metrics: aggregate(grades),
    bySet: Object.fromEntries([...bySet.entries()].map(([k, v]) => [k, aggregate(v)])),
    cost: {
      totalUsd,
      perCaseUsd: ok.length ? totalUsd / ok.length : 0,
      inputTokens,
      outputTokens: sum((p) => p.usage?.outputTokens ?? 0),
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
      cacheHitRate: inputTokens + cacheRead + cacheWrite ? cacheRead / (inputTokens + cacheRead + cacheWrite) : 0,
    },
    latency: {
      p50Ms: percentile(latencies, 0.5),
      p95Ms: percentile(latencies, 0.95),
      meanMs: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    },
  };
  return { summary, perCase };
}

// ─── Bootstrap: draft labels for unlabelled listings ─────────────────
async function bootstrap(count: number, model: string, effort: Effort | undefined, existing: EvalCase[]) {
  const known = new Set(existing.map((c) => c.source_url).filter(Boolean));
  const pending = await getPendingSales({ model, limit: 5000, includeExcerptOnly: false });
  // getPendingSales is keyed by sale id; look the URLs up so labels stay URL-keyed
  const urls = new Map<string, string>();
  const { client } = await import("../../src/lib/db");
  const res = await client.execute("SELECT id, source_url FROM sales WHERE source = 'bat'");
  for (const r of res.rows) urls.set(String(r.id), String(r.source_url));
  const candidates = pending.filter((p) => !known.has(urls.get(p.saleId) ?? "")).slice(0, count);
  console.log(`drafting labels for ${candidates.length} listings with ${model} — review every line before committing`);
  const out = path.join(casesDir, `draft-${new Date().toISOString().slice(0, 10)}.jsonl`);
  const lines: string[] = [];
  for (const c of candidates) {
    try {
      const r = await extractListing(c.input, { model, effort });
      const { summary: _summary, ...expected } = r.data;
      void _summary;
      lines.push(JSON.stringify({ id: `bat-${urls.get(c.saleId)?.split("/listing/")[1]?.replace(/\/$/, "")}`, source_url: urls.get(c.saleId), expected, notes: "DRAFT — model-labelled, not yet reviewed" }));
      process.stdout.write(".");
    } catch (err) {
      process.stdout.write("x");
      console.error(`\n${c.input.title}: ${err instanceof Error ? err.message : err}`);
    }
  }
  fs.writeFileSync(out, lines.join("\n") + "\n");
  console.log(`\nwrote ${lines.length} draft cases to ${out}`);
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const set = arg("set") ?? "all";
  const model = resolveModel(arg("model"));
  const effort = arg("effort") as Effort | undefined;
  const limit = Number(arg("limit") ?? Infinity);
  const concurrency = Number(arg("concurrency") ?? 4);

  const cases = loadCases(set);
  console.log(`loaded ${cases.length} cases from ${set === "all" ? "every set" : set}`);

  const bootstrapCount = arg("bootstrap");
  if (bootstrapCount) {
    if (!isConfigured()) throw new Error("ANTHROPIC_API_KEY is not set");
    return bootstrap(Number(bootstrapCount), model, effort, cases);
  }

  const { resolved, missing } = await resolveInputs(cases);
  if (missing.length) console.log(`skipping ${missing.length} database-backed case(s) whose listing text isn't stored yet: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`);
  const chosen = resolved.slice(0, limit);

  if (flag("dry")) {
    console.log(`${chosen.length} cases ready (${chosen.filter((c) => c.set === "synthetic").length} synthetic). No API calls made.`);
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let predictions: Prediction[];
  const predictionsFile = arg("predictions");
  if (predictionsFile) {
    const saved = readJsonl<Prediction>(predictionsFile);
    const byId = new Map(saved.map((p) => [p.id, p]));
    predictions = chosen.map((c) => byId.get(c.id) ?? { id: c.id, set: c.set, ok: false, error: "not in predictions file", errorKind: "missing" });
  } else {
    if (!isConfigured()) throw new Error("ANTHROPIC_API_KEY is not set — add it to .env.local, or pass --dry / --predictions");
    console.log(`running ${chosen.length} cases through ${model}${effort ? ` (effort ${effort})` : ""}, ${concurrency} at a time`);
    predictions = await runModel(chosen, model, effort, concurrency);
    fs.mkdirSync(resultsDir, { recursive: true });
    const pf = path.join(resultsDir, `predictions-${stamp}-${model}${effort ? `-${effort}` : ""}.jsonl`);
    fs.writeFileSync(pf, predictions.map((p) => JSON.stringify(p)).join("\n") + "\n");
    console.log(`predictions saved to ${path.relative(process.cwd(), pf)}`);
  }

  const { summary, perCase } = summarize(chosen, predictions, model, effort, set, stamp);
  printReport(summary);

  fs.mkdirSync(resultsDir, { recursive: true });
  const rf = path.join(resultsDir, `${stamp}-${model}${effort ? `-${effort}` : ""}.json`);
  fs.writeFileSync(rf, JSON.stringify({ ...summary, perCase }, null, 2));
  console.log(`report saved to ${path.relative(process.cwd(), rf)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
