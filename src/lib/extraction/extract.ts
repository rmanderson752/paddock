// Calls to Claude — one listing at a time through the Messages API, or many
// through the Batch API for backfills at half price. Both paths share the
// same system prompt, schema and post-processing so results are comparable.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { MessageCreateParamsNonStreaming, Message } from "@anthropic-ai/sdk/resources/messages";
import { ExtractedListingSchema, PROMPT_VERSION, SUMMARY_MAX_CHARS, type ExtractedListing, type ExtractionInput } from "./schema";
import { SYSTEM_PROMPT, buildUserMessage, extractionInputHash } from "./prompt";
import { estimateCostUsd, type TokenUsage } from "./pricing";

export const DEFAULT_MODEL = "claude-opus-5";
const MAX_TOKENS = 4096;

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ExtractOptions {
  client?: Anthropic;
  model?: string;
  effort?: Effort;
}

export interface ExtractionResult {
  data: ExtractedListing;
  rawJson: string;
  model: string;
  promptVersion: string;
  inputHash: string;
  usage: TokenUsage;
  costUsd: number | null;
  latencyMs: number;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly kind: "refusal" | "truncated" | "unparseable" | "invalid",
    public readonly rawJson: string | null = null
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function resolveModel(model?: string): string {
  return model ?? process.env.EXTRACTION_MODEL ?? DEFAULT_MODEL;
}

export function resolveEffort(effort?: Effort): Effort | undefined {
  const e = effort ?? (process.env.EXTRACTION_EFFORT as Effort | undefined);
  return e && ["low", "medium", "high", "xhigh", "max"].includes(e) ? e : undefined;
}

let sharedClient: Anthropic | null = null;
function getClient(client?: Anthropic): Anthropic {
  if (client) return client;
  if (!sharedClient) sharedClient = new Anthropic({ maxRetries: 3 });
  return sharedClient;
}

/** The request body both the sync and batch paths send. */
export function buildRequest(input: ExtractionInput, model: string, effort?: Effort): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(input) }],
    output_config: {
      format: zodOutputFormat(ExtractedListingSchema),
      ...(effort ? { effort } : {}),
    },
  };
}

function usageOf(message: Message): TokenUsage {
  return {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
  };
}

/** Enforce the parts of the contract a JSON schema can't express. */
export function normalize(data: ExtractedListing): ExtractedListing {
  const trim = (s: string | null) => (s === null ? null : s.trim() || null);
  const list = (xs: string[]) => Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean)));
  const modifications = list(data.modifications);
  const flags = Array.from(new Set(data.flags));
  if (modifications.length > 0 && !flags.includes("modified")) flags.push("modified");
  let summary = data.summary.replace(/\s+/g, " ").trim();
  if (summary.length > SUMMARY_MAX_CHARS) {
    const cut = summary.slice(0, SUMMARY_MAX_CHARS);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
    summary = end > SUMMARY_MAX_CHARS / 2 ? cut.slice(0, end + 1) : `${cut.replace(/[,;:\s]+$/, "")}…`;
  }
  return {
    ...data,
    mileage: data.mileage !== null && data.mileage >= 0 ? data.mileage : null,
    mileage_unit: data.mileage === null ? null : data.mileage_unit ?? "mi",
    exterior_color: trim(data.exterior_color),
    color_family: data.exterior_color === null ? null : data.color_family,
    interior_color: trim(data.interior_color),
    transmission_detail: trim(data.transmission_detail),
    engine: trim(data.engine),
    owners: data.owners !== null && data.owners > 0 ? data.owners : null,
    years_owned: data.years_owned !== null && data.years_owned >= 0 ? data.years_owned : null,
    flags,
    modifications,
    notable_options: list(data.notable_options),
    summary,
  };
}

/** Turn a raw API message into a validated result (shared by sync and batch). */
export function interpretMessage(message: Message, input: ExtractionInput, model: string, latencyMs: number, batch = false): ExtractionResult {
  if (message.stop_reason === "refusal") {
    throw new ExtractionError("model refused the request", "refusal");
  }
  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (message.stop_reason === "max_tokens") {
    throw new ExtractionError("output truncated at max_tokens", "truncated", text);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ExtractionError("response was not JSON", "unparseable", text);
  }
  const parsed = ExtractedListingSchema.safeParse(json);
  if (!parsed.success) {
    throw new ExtractionError(`response failed schema validation: ${parsed.error.message}`, "invalid", text);
  }
  const usage = usageOf(message);
  return {
    data: normalize(parsed.data),
    rawJson: text,
    model,
    promptVersion: PROMPT_VERSION,
    inputHash: extractionInputHash(input, model),
    usage,
    costUsd: estimateCostUsd(model, usage, { batch }),
    latencyMs,
  };
}

/** Extract one listing synchronously. */
export async function extractListing(input: ExtractionInput, options: ExtractOptions = {}): Promise<ExtractionResult> {
  const client = getClient(options.client);
  const model = resolveModel(options.model);
  const effort = resolveEffort(options.effort);
  const started = Date.now();
  // `create` rather than `parse`: the SDK's parser throws one generic error
  // for truncation, bad JSON and schema misses alike, and the caller needs
  // to tell those apart (retry vs. give up) — interpretMessage does that.
  const message = await client.messages.create(buildRequest(input, model, effort));
  return interpretMessage(message, input, model, Date.now() - started);
}

// ─── Batch API ───────────────────────────────────────────────────────

export interface BatchItem {
  customId: string;
  input: ExtractionInput;
}

export interface SubmittedBatch {
  batchId: string;
  model: string;
  promptVersion: string;
  count: number;
  submittedAt: string;
}

/** Submit up to 100k listings as one batch (50% of list price, ≤ 24 h). */
export async function submitExtractionBatch(items: BatchItem[], options: ExtractOptions = {}): Promise<SubmittedBatch> {
  const client = getClient(options.client);
  const model = resolveModel(options.model);
  const effort = resolveEffort(options.effort);
  const batch = await client.messages.batches.create({
    requests: items.map((item) => ({
      custom_id: item.customId,
      params: buildRequest(item.input, model, effort),
    })),
  });
  return { batchId: batch.id, model, promptVersion: PROMPT_VERSION, count: items.length, submittedAt: new Date().toISOString() };
}

export interface BatchStatus {
  status: string;
  processing: number;
  succeeded: number;
  errored: number;
  expired: number;
  canceled: number;
}

export async function getBatchStatus(batchId: string, options: ExtractOptions = {}): Promise<BatchStatus> {
  const client = getClient(options.client);
  const b = await client.messages.batches.retrieve(batchId);
  return {
    status: b.processing_status,
    processing: b.request_counts.processing,
    succeeded: b.request_counts.succeeded,
    errored: b.request_counts.errored,
    expired: b.request_counts.expired,
    canceled: b.request_counts.canceled,
  };
}

export type BatchOutcome =
  | { customId: string; ok: true; result: ExtractionResult }
  | { customId: string; ok: false; error: string; retryable: boolean };

/**
 * Stream the results of an ended batch. `inputs` must map each custom_id
 * back to the text that was submitted, so the row can be validated and
 * hashed exactly like a synchronous extraction.
 */
export async function collectExtractionBatch(
  batchId: string,
  inputs: Map<string, ExtractionInput>,
  model: string,
  options: ExtractOptions = {}
): Promise<BatchOutcome[]> {
  const client = getClient(options.client);
  const outcomes: BatchOutcome[] = [];
  for await (const entry of await client.messages.batches.results(batchId)) {
    const input = inputs.get(entry.custom_id);
    if (!input) {
      outcomes.push({ customId: entry.custom_id, ok: false, error: "no input recorded for this custom_id", retryable: false });
      continue;
    }
    const r = entry.result;
    if (r.type === "succeeded") {
      try {
        outcomes.push({ customId: entry.custom_id, ok: true, result: interpretMessage(r.message, input, model, 0, true) });
      } catch (err) {
        const e = err as ExtractionError;
        outcomes.push({ customId: entry.custom_id, ok: false, error: e.message, retryable: e.kind === "truncated" });
      }
    } else if (r.type === "errored") {
      const type = r.error.error.type;
      outcomes.push({ customId: entry.custom_id, ok: false, error: `${type}: ${r.error.error.message}`, retryable: type !== "invalid_request_error" });
    } else if (r.type === "expired") {
      outcomes.push({ customId: entry.custom_id, ok: false, error: "expired", retryable: true });
    } else {
      outcomes.push({ customId: entry.custom_id, ok: false, error: "canceled", retryable: true });
    }
  }
  return outcomes;
}
