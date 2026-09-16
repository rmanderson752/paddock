// Grading for the extraction eval — pure functions, no I/O.
//
// The output is structured, so grading is programmatic: exact match for
// enums, numbers and booleans; a normalised string match for names the
// listing spells in its own way; set precision/recall for flags; and a few
// faithfulness checks on the free-text summary (length, no price, every
// number traceable to the input). Nullable fields report a confusion
// breakdown, because "said nothing" and "said the wrong thing" are different
// failures for a buyer.

import { CONDITION_FLAGS, SUMMARY_MAX_CHARS, type ConditionFlag, type ExtractedListing, type ExtractionInput } from "./schema";

/** What a labelled case asserts. Everything optional so labels can be partial. */
export type ExpectedListing = Partial<Omit<ExtractedListing, "summary">>;

export const EXACT_FIELDS = [
  "mileage", "mileage_unit", "mileage_tmu", "color_family", "transmission", "title_status", "owners", "years_owned",
] as const;
export const FUZZY_FIELDS = ["exterior_color", "interior_color", "transmission_detail", "engine"] as const;
export const LIST_FIELDS = ["modifications", "notable_options"] as const;

export type ScalarField = (typeof EXACT_FIELDS)[number] | (typeof FUZZY_FIELDS)[number];
export type Outcome = "correct" | "wrong_value" | "false_positive" | "false_negative";

export interface FieldGrade {
  field: ScalarField;
  outcome: Outcome;
  expected: unknown;
  predicted: unknown;
}

export interface ListGrade {
  field: (typeof LIST_FIELDS)[number];
  expected: string[];
  predicted: string[];
  matchedExpected: number;
  matchedPredicted: number;
}

export interface FlagGrade {
  expected: ConditionFlag[];
  predicted: ConditionFlag[];
  tp: ConditionFlag[];
  fp: ConditionFlag[];
  fn: ConditionFlag[];
}

export interface SummaryGrade {
  length: number;
  withinLength: boolean;
  sentenceCount: number;
  atMostTwoSentences: boolean;
  noPrice: boolean;
  numbersGrounded: boolean;
  ungroundedNumbers: string[];
}

export interface CaseGrade {
  fields: FieldGrade[];
  lists: ListGrade[];
  flags: FlagGrade | null;
  summary: SummaryGrade;
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"’']/g, "")
    .replace(/\bgray\b/g, "grey")
    .replace(/\bcolour\b/g, "color")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Names match when equal after normalisation, when one contains the other
 * ("Slate Grey Metallic" ~ "Slate Grey Metallic Paint"), or when they share
 * two thirds of their meaningful words ("Black and Red" ~ "Black Ecsaine and
 * Red") — but not merely a colour word ("Guards Red" vs "Arena Red").
 */
export function fuzzyEquals(a: string, b: string): boolean {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return x === y;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const tx = tokens(x);
  const ty = tokens(y);
  if (tx.size === 0 || ty.size === 0) return false;
  let shared = 0;
  for (const t of tx) if (ty.has(t)) shared++;
  return shared >= 2 && shared / Math.max(tx.size, ty.size) >= 0.67;
}

function tokens(s: string): Set<string> {
  return new Set(normalizeText(s).split(" ").filter((t) => t.length > 2));
}

/** Two short phrases describe the same thing when they share half their tokens. */
export function phraseMatches(a: string, b: string): boolean {
  if (fuzzyEquals(a, b)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size) >= 0.5;
}

function gradeScalar(field: ScalarField, expected: unknown, predicted: unknown, fuzzy: boolean): FieldGrade {
  const expNull = expected === null || expected === undefined;
  const predNull = predicted === null || predicted === undefined;
  let outcome: Outcome;
  if (expNull && predNull) outcome = "correct";
  else if (expNull) outcome = "false_positive";
  else if (predNull) outcome = "false_negative";
  else if (fuzzy ? fuzzyEquals(String(expected), String(predicted)) : expected === predicted) outcome = "correct";
  else outcome = "wrong_value";
  return { field, outcome, expected: expNull ? null : expected, predicted: predNull ? null : predicted };
}

function gradeList(field: (typeof LIST_FIELDS)[number], expected: string[], predicted: string[]): ListGrade {
  const matchedExpected = expected.filter((e) => predicted.some((p) => phraseMatches(e, p))).length;
  const matchedPredicted = predicted.filter((p) => expected.some((e) => phraseMatches(e, p))).length;
  return { field, expected, predicted, matchedExpected, matchedPredicted };
}

function gradeFlags(expected: ConditionFlag[], predicted: ConditionFlag[]): FlagGrade {
  const exp = new Set(expected);
  const pred = new Set(predicted);
  return {
    expected,
    predicted,
    tp: CONDITION_FLAGS.filter((f) => exp.has(f) && pred.has(f)),
    fp: CONDITION_FLAGS.filter((f) => !exp.has(f) && pred.has(f)),
    fn: CONDITION_FLAGS.filter((f) => exp.has(f) && !pred.has(f)),
  };
}

/** "115k" → "115000", "1,200" → "1200", "3.6" stays "3.6" */
function numberForms(raw: string): string[] {
  const s = raw.toLowerCase().replace(/,/g, "");
  const k = s.match(/^(\d+(?:\.\d+)?)k$/);
  if (k) return [String(Math.round(parseFloat(k[1]) * 1000)), s];
  return [s];
}

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?k?/gi;

export function gradeSummary(summary: string, input: ExtractionInput): SummaryGrade {
  const text = summary.trim();
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
  const haystack = `${input.title}\n${input.essentials.join("\n")}\n${input.description}`.toLowerCase().replace(/,/g, "");
  const haystackForms = new Set<string>();
  for (const m of haystack.match(NUMBER_RE) ?? []) for (const f of numberForms(m)) haystackForms.add(f);
  const ungrounded: string[] = [];
  for (const m of text.match(NUMBER_RE) ?? []) {
    const forms = numberForms(m);
    if (!forms.some((f) => haystackForms.has(f))) ungrounded.push(m);
  }
  return {
    length: text.length,
    withinLength: text.length <= SUMMARY_MAX_CHARS,
    sentenceCount: sentences.length,
    atMostTwoSentences: sentences.length <= 2,
    noPrice: !/\$|\busd\b|\bbid\b|\bsold for\b/i.test(text),
    numbersGrounded: ungrounded.length === 0,
    ungroundedNumbers: ungrounded,
  };
}

/** Grade one prediction against a (possibly partial) label. */
export function gradeCase(expected: ExpectedListing, predicted: ExtractedListing, input: ExtractionInput): CaseGrade {
  const fields: FieldGrade[] = [];
  for (const f of EXACT_FIELDS) {
    if (!(f in expected)) continue;
    fields.push(gradeScalar(f, expected[f], predicted[f], false));
  }
  for (const f of FUZZY_FIELDS) {
    if (!(f in expected)) continue;
    fields.push(gradeScalar(f, expected[f], predicted[f], true));
  }
  const lists: ListGrade[] = [];
  for (const f of LIST_FIELDS) {
    if (!(f in expected) || !expected[f]) continue;
    lists.push(gradeList(f, expected[f]!, predicted[f]));
  }
  return {
    fields,
    lists,
    flags: expected.flags ? gradeFlags(expected.flags, predicted.flags) : null,
    summary: gradeSummary(predicted.summary, input),
  };
}

// ─── Aggregation ─────────────────────────────────────────────────────

export interface FieldMetrics {
  field: string;
  n: number;
  accuracy: number;
  correct: number;
  wrongValue: number;
  falsePositive: number;
  falseNegative: number;
  /** Of the values the model asserted, how many were right */
  precision: number | null;
  /** Of the values the label had, how many the model found and got right */
  recall: number | null;
}

export interface ListMetrics {
  field: string;
  n: number;
  precision: number | null;
  recall: number | null;
}

export interface FlagMetrics {
  n: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  perFlag: { flag: ConditionFlag; tp: number; fp: number; fn: number; precision: number | null; recall: number | null }[];
  /** Cases where the whole flag set matched exactly */
  exactSetAccuracy: number;
}

export interface SummaryMetrics {
  n: number;
  withinLength: number;
  atMostTwoSentences: number;
  noPrice: number;
  numbersGrounded: number;
  meanLength: number;
}

export interface Aggregate {
  cases: number;
  fields: FieldMetrics[];
  lists: ListMetrics[];
  flags: FlagMetrics | null;
  summary: SummaryMetrics;
  /** Mean accuracy over the core fields and flag F1 — the headline number */
  coreScore: number;
}

export const CORE_FIELDS: ScalarField[] = ["mileage", "mileage_tmu", "exterior_color", "color_family", "transmission", "title_status"];

const ratio = (num: number, den: number): number | null => (den === 0 ? null : num / den);

export function aggregate(grades: CaseGrade[]): Aggregate {
  const byField = new Map<string, FieldGrade[]>();
  for (const g of grades) for (const f of g.fields) byField.set(f.field, [...(byField.get(f.field) ?? []), f]);

  const fields: FieldMetrics[] = [...byField.entries()].map(([field, fs]) => {
    const count = (o: Outcome) => fs.filter((f) => f.outcome === o).length;
    const correct = count("correct");
    const wrongValue = count("wrong_value");
    const falsePositive = count("false_positive");
    const falseNegative = count("false_negative");
    const correctPresent = fs.filter((f) => f.outcome === "correct" && f.expected !== null).length;
    const predictedPresent = fs.filter((f) => f.predicted !== null).length;
    const expectedPresent = fs.filter((f) => f.expected !== null).length;
    return {
      field,
      n: fs.length,
      accuracy: fs.length ? correct / fs.length : 0,
      correct,
      wrongValue,
      falsePositive,
      falseNegative,
      precision: ratio(correctPresent, predictedPresent),
      recall: ratio(correctPresent, expectedPresent),
    };
  });

  const byList = new Map<string, ListGrade[]>();
  for (const g of grades) for (const l of g.lists) byList.set(l.field, [...(byList.get(l.field) ?? []), l]);
  const lists: ListMetrics[] = [...byList.entries()].map(([field, ls]) => ({
    field,
    n: ls.length,
    precision: ratio(ls.reduce((a, l) => a + l.matchedPredicted, 0), ls.reduce((a, l) => a + l.predicted.length, 0)),
    recall: ratio(ls.reduce((a, l) => a + l.matchedExpected, 0), ls.reduce((a, l) => a + l.expected.length, 0)),
  }));

  const flagGrades = grades.map((g) => g.flags).filter((f): f is FlagGrade => f !== null);
  let flags: FlagMetrics | null = null;
  if (flagGrades.length) {
    const tp = flagGrades.reduce((a, f) => a + f.tp.length, 0);
    const fp = flagGrades.reduce((a, f) => a + f.fp.length, 0);
    const fn = flagGrades.reduce((a, f) => a + f.fn.length, 0);
    const precision = ratio(tp, tp + fp);
    const recall = ratio(tp, tp + fn);
    const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
    flags = {
      n: flagGrades.length,
      precision,
      recall,
      f1,
      perFlag: CONDITION_FLAGS.map((flag) => {
        const ftp = flagGrades.filter((f) => f.tp.includes(flag)).length;
        const ffp = flagGrades.filter((f) => f.fp.includes(flag)).length;
        const ffn = flagGrades.filter((f) => f.fn.includes(flag)).length;
        return { flag, tp: ftp, fp: ffp, fn: ffn, precision: ratio(ftp, ftp + ffp), recall: ratio(ftp, ftp + ffn) };
      }),
      exactSetAccuracy: flagGrades.filter((f) => f.fp.length === 0 && f.fn.length === 0).length / flagGrades.length,
    };
  }

  const summaries = grades.map((g) => g.summary);
  const summary: SummaryMetrics = {
    n: summaries.length,
    withinLength: summaries.filter((s) => s.withinLength).length,
    atMostTwoSentences: summaries.filter((s) => s.atMostTwoSentences).length,
    noPrice: summaries.filter((s) => s.noPrice).length,
    numbersGrounded: summaries.filter((s) => s.numbersGrounded).length,
    meanLength: summaries.length ? summaries.reduce((a, s) => a + s.length, 0) / summaries.length : 0,
  };

  const coreAccuracies = fields.filter((f) => (CORE_FIELDS as string[]).includes(f.field)).map((f) => f.accuracy);
  if (flags?.f1 !== null && flags?.f1 !== undefined) coreAccuracies.push(flags.f1);
  const coreScore = coreAccuracies.length ? coreAccuracies.reduce((a, b) => a + b, 0) / coreAccuracies.length : 0;

  return { cases: grades.length, fields, lists, flags, summary, coreScore };
}
