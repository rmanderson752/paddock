// The extraction contract — what Claude is asked to pull out of a listing.
//
// Safe to import from client components (types and enums only, no SDK). The
// Zod schema is both the structured-output format sent to the API and the
// validator applied to whatever comes back; the same object types feed the
// eval harness, so a schema change is automatically an eval change.

import { z } from "zod";
import { CONDITION_FLAGS } from "../types";

/** Bump whenever the schema, the system prompt or the examples change. */
export const PROMPT_VERSION = "2026-09-15.2";

export const COLOR_FAMILIES = [
  "red", "blue", "white", "black", "silver", "grey", "yellow", "green",
  "orange", "brown", "purple", "gold", "other",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export { CONDITION_FLAGS, FLAG_LABELS, type ConditionFlag } from "../types";

export const ExtractedListingSchema = z.object({
  mileage: z
    .number()
    .int()
    .nullable()
    .describe("Odometer reading as shown, as a whole number in `mileage_unit` ('115k Miles Shown' → 115000). null when the listing gives no reading."),
  mileage_unit: z.enum(["mi", "km"]).nullable().describe("Unit of `mileage`; null when mileage is null."),
  mileage_tmu: z
    .boolean()
    .describe("True when the true mileage is unknown or the reading is not the car's actual mileage: replaced, repaired or rolled-over odometer, 'TMU', 'not actual', or mileage the seller says cannot be verified. False otherwise, including when no mileage is stated."),
  exterior_color: z
    .string()
    .nullable()
    .describe("Exterior paint colour exactly as the listing names it ('Grand Prix White', 'Slate Grey Metallic', 'Rosso Corsa'). null when not stated."),
  color_family: z
    .enum(COLOR_FAMILIES)
    .nullable()
    .describe("Broad family of `exterior_color`; null when exterior_color is null. Metallic/pearl does not change the family. Two-tone: the main body colour."),
  interior_color: z.string().nullable().describe("Interior/upholstery colour as named ('Black', 'Linen Gray', 'Tan'), without the material. null when not stated."),
  transmission: z
    .enum(["manual", "automatic"])
    .nullable()
    .describe("'manual' only for a clutch-pedal gearbox. Automated manuals (Ferrari F1, BMW SMG), dual-clutch (PDK, DCT), Tiptronic and torque-converter automatics are all 'automatic'. null when not stated."),
  transmission_detail: z.string().nullable().describe("The gearbox as the listing names it ('Five-Speed G50 Manual Transaxle', 'F1 Automated Manual'). null when not stated."),
  engine: z.string().nullable().describe("The engine as the listing names it ('3.6-Liter Twin-Turbocharged Flat-Six', '2.6L Twin-Turbocharged RB26 Inline-Six'). null when not stated."),
  owners: z.number().int().nullable().describe("Total number of owners when stated ('one-owner' → 1, 'two owners from new' → 2). null when not stated or only vaguely implied."),
  years_owned: z
    .number()
    .int()
    .nullable()
    .describe("Years with the selling owner when stated or directly computable ('24-Years-Owned' → 24; 'purchased by the seller in 2002' with the auction closing in 2026 → 24). null otherwise."),
  title_status: z
    .enum(["clean", "salvage", "rebuilt", "other"])
    .nullable()
    .describe("'clean' when a clean title is stated; 'salvage'/'rebuilt' when branded; 'other' for bonded, bill-of-sale, export-only etc. null when the listing does not say. A clean *Carfax* alone does not establish title status."),
  flags: z
    .array(z.enum(CONDITION_FLAGS))
    .describe("Every flag the text supports, none it doesn't. accident_history: a stated accident, collision, damage entry or accident repair (a clean history report is not a flag). repaint: full or partial repaint or refinished body panels (not touch-ups, wraps or refinished wheels). engine_replaced_or_rebuilt: engine swapped, replaced, overhauled or rebuilt (not an engine-out service, reseal or timing-belt job). rust_or_corrosion: rust, corrosion or bubbling noted, even if since repaired. modified: any non-factory change (set whenever modifications is non-empty). track_use: actual track, HPDE, autocross or race use. needs_work: mechanical or functional problems — faults, leaks, warning lights, inoperative items, failed inspections, work the seller says is needed (cosmetic wear alone does not count). service_records: service records, invoices or receipts accompany the car (a history report, window sticker or manual does not count)."),
  modifications: z
    .array(z.string())
    .describe("Non-factory changes, each a short phrase ('aftermarket exhaust', 'lowering springs', 'ECU tune'). Empty when stock or unstated. Non-empty implies the 'modified' flag."),
  notable_options: z
    .array(z.string())
    .describe("Factory options or special equipment that move value, each a short phrase ('limited-slip differential', 'sport seats', 'Fiorano handling package'). Empty when none are stated."),
  summary: z
    .string()
    .describe("One or two neutral sentences, at most 220 characters, with what a buyer most needs to know: spec, ownership history, condition. Only facts present in the text; no price or bid, no marketing language, no restating the year/make/model."),
});

export type ExtractedListing = z.infer<typeof ExtractedListingSchema>;

/** The text handed to the model for one sale. */
export interface ExtractionInput {
  title: string;
  /** "BaT Essentials" bullets; empty when only the excerpt is available */
  essentials: string[];
  description: string;
  /** ISO date the auction closed, when known */
  closedOn: string | null;
  /** How Paddock files the car, e.g. "Porsche 911 — 964 Carrera (1989–1994)" */
  car: string | null;
}

export const SUMMARY_MAX_CHARS = 220;
