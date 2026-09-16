/**
 * Extract structured details from stored listing text with Claude.
 *
 * Default is the Batch API — half price, results within an hour, ideal for a
 * backfill. The job's state (which sale each request belongs to, and the
 * exact text sent) is saved under data/batches/ so a batch can be collected
 * later or from another shell. `--sync` uses the Messages API directly for
 * small runs.
 *
 * Usage:
 *   npx tsx scripts/extract-details.ts                     # submit everything pending, wait, store
 *   npx tsx scripts/extract-details.ts --limit 20 --sync   # a handful, synchronously
 *   npx tsx scripts/extract-details.ts --no-wait           # submit and exit
 *   npx tsx scripts/extract-details.ts --collect <batchId> # store the results of an ended batch
 *   npx tsx scripts/extract-details.ts --model claude-sonnet-5 --effort medium
 *   npx tsx scripts/extract-details.ts --include-excerpts  # don't wait for listing pages
 *   npx tsx scripts/extract-details.ts --include-unsold    # bid-not-met listings too (skipped by default)
 */

import "./env";
import * as fs from "fs";
import * as path from "path";
import {
  collectExtractionBatch,
  extractPendingSales,
  getBatchStatus,
  getPendingSales,
  isConfigured,
  promoteDetailsToSales,
  resolveModel,
  saveExtractions,
  submitExtractionBatch,
  type Effort,
  type ExtractionInput,
} from "../src/lib/extraction";

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && !process.argv[i + 1]?.startsWith("--") ? process.argv[i + 1] : undefined;
}

interface BatchState {
  batchId: string;
  model: string;
  promptVersion: string;
  submittedAt: string;
  items: { customId: string; saleId: string; inputHash: string; input: ExtractionInput }[];
}

const stateDir = path.resolve("data/batches");
const statePath = (id: string) => path.join(stateDir, `${id}.json`);

function saveState(state: BatchState) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath(state.batchId), JSON.stringify(state, null, 2));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function collect(batchId: string): Promise<void> {
  const file = statePath(batchId);
  if (!fs.existsSync(file)) throw new Error(`No state for batch ${batchId} in ${stateDir}`);
  const state = JSON.parse(fs.readFileSync(file, "utf8")) as BatchState;

  let status = await getBatchStatus(batchId);
  while (status.status !== "ended") {
    console.log(`batch ${batchId}: ${status.status} — ${status.processing} processing, ${status.succeeded} succeeded, ${status.errored} errored`);
    await sleep(60_000);
    status = await getBatchStatus(batchId);
  }
  console.log(`batch ${batchId} ended: ${status.succeeded} succeeded, ${status.errored} errored, ${status.expired} expired, ${status.canceled} canceled`);

  const inputs = new Map(state.items.map((i) => [i.customId, i.input]));
  const saleIds = new Map(state.items.map((i) => [i.customId, i.saleId]));
  const outcomes = await collectExtractionBatch(batchId, inputs, state.model);

  const rows = [];
  let cost = 0;
  const failures: string[] = [];
  for (const o of outcomes) {
    if (o.ok) {
      rows.push({ saleId: saleIds.get(o.customId)!, result: o.result });
      cost += o.result.costUsd ?? 0;
    } else {
      failures.push(`${o.customId}: ${o.error}${o.retryable ? " (retryable)" : ""}`);
    }
  }
  await saveExtractions(rows);
  const promoted = await promoteDetailsToSales(rows.map((r) => r.saleId));
  console.log(`stored ${rows.length} extractions ($${cost.toFixed(3)} at batch rates), promoted ${promoted} onto sales`);
  if (failures.length) {
    console.log(`${failures.length} failed:`);
    for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
    console.log("re-run without --collect to resubmit anything still pending");
  }
  fs.renameSync(file, `${file.replace(/\.json$/, "")}.done.json`);
}

async function main() {
  if (!isConfigured()) {
    console.error("ANTHROPIC_API_KEY is not set (add it to .env.local)");
    process.exit(1);
  }
  const model = resolveModel(arg("model"));
  const effort = arg("effort") as Effort | undefined;
  const limit = Number(arg("limit") ?? 100_000);
  const includeExcerptOnly = flag("include-excerpts");
  const soldOnly = !flag("include-unsold");

  const collectId = arg("collect");
  if (collectId) return collect(collectId);

  if (flag("sync")) {
    const summary = await extractPendingSales({ model, effort, limit, includeExcerptOnly, soldOnly, concurrency: 4, log: (m) => console.log(m) });
    console.log(`\n${summary.extracted} extracted, ${summary.failed} failed, $${summary.costUsd.toFixed(3)}`);
    return;
  }

  const pending = await getPendingSales({ model, limit, includeExcerptOnly, soldOnly });
  if (pending.length === 0) {
    console.log("Nothing pending — every stored listing has an extraction for this prompt version and model");
    return;
  }
  console.log(`submitting ${pending.length} listing${pending.length === 1 ? "" : "s"} to the Batch API (${model}${effort ? `, effort ${effort}` : ""})`);

  const items = pending.map((p, i) => ({ customId: `sale-${i}-${p.saleId.slice(0, 8)}`, input: p.input }));
  const submitted = await submitExtractionBatch(items, { model, effort });
  const state: BatchState = {
    batchId: submitted.batchId,
    model: submitted.model,
    promptVersion: submitted.promptVersion,
    submittedAt: submitted.submittedAt,
    items: items.map((item, i) => ({ customId: item.customId, saleId: pending[i].saleId, inputHash: pending[i].inputHash, input: item.input })),
  };
  saveState(state);
  console.log(`batch ${submitted.batchId} submitted — state saved to ${statePath(submitted.batchId)}`);

  if (flag("no-wait")) {
    console.log(`collect later with: npx tsx scripts/extract-details.ts --collect ${submitted.batchId}`);
    return;
  }
  await collect(submitted.batchId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
