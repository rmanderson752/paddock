// Server-only entry point for the extraction pipeline.
//
//   listing text (sale_listings) ──► Claude, structured output ──► sale_details ──► sales
//
// `extractPendingSales` is what the refresh job and the admin page call: a
// bounded, idempotent pass over sales whose text hasn't been extracted with
// the current prompt and model. Backfills go through the Batch API in
// scripts/extract-details.ts.

import { extractListing, isConfigured, resolveModel, ExtractionError, type ExtractOptions, type ExtractionResult } from "./extract";
import { getPendingSales, saveExtractions, promoteDetailsToSales } from "./store";

export * from "./schema";
export * from "./extract";
export * from "./store";
export { SYSTEM_PROMPT, buildUserMessage, extractionInputHash } from "./prompt";
export { estimateCostUsd } from "./pricing";

export interface ExtractPendingOptions extends ExtractOptions {
  limit?: number;
  concurrency?: number;
  includeExcerptOnly?: boolean;
  soldOnly?: boolean;
  saleIds?: string[];
  /** Stop starting new extractions after this long (a serverless run has a hard ceiling) */
  timeBudgetMs?: number;
  log?: (message: string) => void;
}

export interface ExtractPendingSummary {
  pending: number;
  extracted: number;
  failed: number;
  costUsd: number;
  skippedReason?: string;
}

export async function extractPendingSales(options: ExtractPendingOptions = {}): Promise<ExtractPendingSummary> {
  const log = options.log ?? (() => {});
  const summary: ExtractPendingSummary = { pending: 0, extracted: 0, failed: 0, costUsd: 0 };
  if (!isConfigured()) {
    summary.skippedReason = "ANTHROPIC_API_KEY not set";
    log(`extraction skipped: ${summary.skippedReason}`);
    return summary;
  }

  const model = resolveModel(options.model);
  const pending = await getPendingSales({
    model,
    limit: options.limit ?? 50,
    includeExcerptOnly: options.includeExcerptOnly,
    soldOnly: options.soldOnly,
    saleIds: options.saleIds,
  });
  summary.pending = pending.length;
  log(`extraction: ${pending.length} sale${pending.length === 1 ? "" : "s"} pending (${model})`);
  if (pending.length === 0) return summary;

  const concurrency = Math.max(1, options.concurrency ?? 4);
  const results: { saleId: string; result: ExtractionResult }[] = [];
  const deadline = options.timeBudgetMs ? Date.now() + options.timeBudgetMs : Infinity;
  let next = 0;

  async function worker() {
    while (next < pending.length && Date.now() < deadline) {
      const item = pending[next++];
      try {
        const result = await extractListing(item.input, { client: options.client, model, effort: options.effort });
        results.push({ saleId: item.saleId, result });
        summary.costUsd += result.costUsd ?? 0;
        log(`  ✓ ${item.input.title} — ${result.latencyMs} ms, $${(result.costUsd ?? 0).toFixed(4)}`);
      } catch (err) {
        summary.failed++;
        const why = err instanceof ExtractionError ? `${err.kind}: ${err.message}` : err instanceof Error ? err.message : String(err);
        log(`  ✕ ${item.input.title} — ${why}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));

  await saveExtractions(results);
  await promoteDetailsToSales(results.map((r) => r.saleId));
  summary.extracted = results.length;
  const leftover = pending.length - next;
  log(`extraction: ${results.length} saved, ${summary.failed} failed, $${summary.costUsd.toFixed(3)}${leftover > 0 ? ` — ${leftover} deferred to the next run (time budget)` : ""}`);
  return summary;
}
