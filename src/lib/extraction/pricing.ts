// Per-token list prices (USD per million tokens) used to attribute a cost to
// every extraction. Cache writes bill at 1.25× input, cache reads at 0.1×,
// and the Batch API halves everything. Rates as published September 2026 —
// this table is the only place to update when they change.

export interface ModelPrice {
  input: number;
  output: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** null when the model isn't in the table, so callers can't silently under-report. */
export function estimateCostUsd(model: string, usage: TokenUsage, { batch = false } = {}): number | null {
  const price = PRICES[model];
  if (!price) return null;
  const perTok = 1 / 1_000_000;
  const cost =
    usage.inputTokens * price.input * perTok +
    usage.cacheWriteTokens * price.input * 1.25 * perTok +
    usage.cacheReadTokens * price.input * 0.1 * perTok +
    usage.outputTokens * price.output * perTok;
  return batch ? cost / 2 : cost;
}

export function knownModels(): string[] {
  return Object.keys(PRICES);
}
