# Extraction eval

Measures how well the listing extractor (`src/lib/extraction`) turns a Bring a
Trailer listing into the structured fields Paddock stores in `sale_details`.
Run it before changing the prompt, the schema or the model, and again after.

```bash
npm run eval:extraction                                  # every case, default model
npm run eval:extraction -- --model claude-sonnet-5       # compare models
npm run eval:extraction -- --model claude-opus-5 --effort low
npm run eval:extraction -- --set synthetic               # in-repo cases only, no database needed
npm run eval:extraction -- --dry                         # validate cases, no API calls
npm run eval:extraction -- --predictions evals/extraction/results/predictions-<stamp>.jsonl   # regrade a saved run
```

Needs `ANTHROPIC_API_KEY` in `.env.local` (except `--dry` / `--predictions`).
Database-backed cases read listing text from the configured database
(`TURSO_DATABASE_URL` or the local file) — run `npm run db:listings` first if
they're reported as missing. They go through the same boilerplate pruning
(`src/lib/extraction/prune.ts`) as production, so the eval sees exactly what
the pipeline sends.

## Cases

Two sets, both in `cases/`, one JSON object per line:

- **`synthetic.jsonl`** — 25 listings written in BaT's house style, each built
  to pin down one rule: repaired odometer → TMU, F1/SMG/PDK → automatic,
  Italian colour names → family, a wrap vs. the paint underneath, "purchased
  new" vs. a stated purchase year, cosmetic wear vs. `needs_work`, and so on.
  These carry their input inline so the set runs from a fresh clone.
- **`golden.jsonl`** — 46 real listings, labelled by hand after reading the
  full text, keyed by `source_url`; the input is loaded from `sale_listings`
  at run time so no listing text is committed. The listing that is the
  prompt's worked example is deliberately excluded.

Every case is `{ id, input | source_url, expected, notes }`. `expected` may be
partial — only the fields it names are graded — but every value must be
schema-valid (the runner checks). `notes` says why the case exists, which is
the first thing to read when it fails.

To grow the golden set: `npm run eval:extraction -- --bootstrap 30` drafts
labels for unlabelled listings with the current model into
`cases/draft-<date>.jsonl`. **Those are model outputs, not labels** — read the
listing, correct every line, then move the case into `golden.jsonl`.

## Grading (`src/lib/extraction/grade.ts`)

The output is structured, so grading is programmatic and free:

| Field kind | Fields | How |
| --- | --- | --- |
| Exact | `mileage`, `mileage_unit`, `mileage_tmu`, `color_family`, `transmission`, `title_status`, `owners`, `years_owned` | strict equality |
| Fuzzy name | `exterior_color`, `interior_color`, `transmission_detail`, `engine` | equal after normalisation, one contains the other, or ≥ ⅔ of meaningful words shared — "Slate Grey Metallic" ≈ "Slate Grey Metallic Paint", but "Guards Red" ≠ "Arena Red" |
| Set | `flags` | micro precision / recall / F1 across all flags, per-flag breakdown, and exact-set accuracy |
| Soft list | `modifications`, `notable_options` | phrase-level precision / recall (half the words shared counts as a match); informational, not part of the headline |
| Summary | `summary` | ≤ 220 chars, ≤ 2 sentences, no price or bid talk, and every number in it appears in the listing ("115k" ≈ "115,000") |

Nullable fields get a confusion breakdown — `correct`, `wrong_value`,
`false_positive` (asserted something the listing doesn't say), `false_negative`
(missed something it does) — with precision and recall over the non-null
values, because "said nothing" and "said the wrong thing" cost a buyer
differently. The **core score** is the mean of accuracy on `mileage`,
`mileage_tmu`, `exterior_color`, `color_family`, `transmission`,
`title_status` and the flag F1; everything else is reported alongside.

Side channel per run: input / cached / output tokens, cache hit rate, cost per
case, and p50 / p95 latency.

## Results

Each run writes `results/<stamp>-<model>[-effort].json` (aggregate metrics plus
per-case grades) and `results/predictions-<stamp>-…jsonl` (raw outputs, not
committed). Record headline numbers here when they inform a decision:

| Date | Model / effort | Prompt | Cases | Core score | Flags F1 | $/case | p50 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| _pending — first run needs an API key_ | | | | | | | |
