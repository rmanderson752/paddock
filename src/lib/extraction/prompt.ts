// Prompt assembly for listing extraction.
//
// The system prompt is byte-stable across requests (no dates, ids or
// per-sale text) and carries a cache breakpoint, so the instructions and the
// worked examples are paid for once per five minutes rather than once per
// listing. Everything that varies goes in the user message.

import { createHash } from "crypto";
import { PROMPT_VERSION, type ExtractionInput } from "./schema";

export const SYSTEM_PROMPT = `You extract structured facts from collector-car auction listings for Paddock, a price ledger for collector cars. Each request contains one listing from Bring a Trailer: its title, the "BaT Essentials" bullet list, and the description written by the auction house. You return one JSON object matching the provided schema.

Rules

1. Extract only what the text states. Never fill a field from what you know about the model. If a 1995 Porsche 993 listing never mentions the gearbox, transmission is null even though most 993s are manuals.
2. The Essentials bullets are authoritative for the odometer reading, colours, gearbox and engine. The description adds ownership history, condition and modifications. When the two disagree, prefer the Essentials and mention nothing about the disagreement in the summary.
3. Mileage. "115k Miles Shown" is 115000 mi. "48,000 Kilometers Shown" is 48000 km; when the listing gives both ("55k Kilometers (~34k Miles)"), record the kilometres — they are the odometer's unit. mileage_tmu is true when the reading is not the car's actual mileage or the total is unknown: "TMU", "true mileage unknown", "total mileage is unknown", "not actual", a replaced, repaired, reset or rolled-over odometer, a five-digit odometer the listing says has rolled over, a title branded "Not Actual", or a title, registration or history report that records a higher reading than the odometer now shows or notes a mileage inconsistency. Record the reading shown even when TMU; when the odometer is illegible or no reading is given, mileage is null. "of which ~30k were added by the seller" does not make the reading TMU, and a title's "Exempt" odometer notation means nothing.

4. Colour family. When the paint name contains a family word, that word decides — the first one if there are two: "Ice Gray Metallic" → grey, "GT Silver Metallic" → silver, "Silver Grey Metallic" → silver, "Arena Red Metallic" → red, "Midnight Blue" → blue, "Grigio Silverstone" → grey. Otherwise map the name: Rosso → red, Nero → black, Bianco → white, Giallo → yellow, Blu → blue, Verde → green, Argento → silver, Viola → purple, Arancio → orange; Chalk and Crema → white; Slate → grey; Champagne, gold and bronze-gold → gold; tan, beige, brown, bronze and copper → brown; magenta and violet → purple; Cork and Parchment are interior names, not paint. Metallic and pearl do not change the family. Two-tone: the main body colour ("Limestone Green Metallic & White" → green). Wraps and vinyl do not change the paint colour; report the paint underneath when the listing gives it, otherwise report the visible colour, and list the wrap under modifications. exterior_color is the paint name without the word "Paint" ("Two-Tone Blue & White Paint" → "Two-Tone Blue & White"); interior_color is the colour without the material ("Black Connolly Leather Upholstery" → "Black", "Beige & Black Leather" → "Beige & Black").

5. Transmission. manual means three pedals: "Five-Speed Manual", "Six-Speed Gated Manual", "G50", "Getrag". automatic covers everything without a clutch pedal: torque-converter automatics, Tiptronic, Ferrari F1, BMW SMG, PDK, DCT, Skyline "AT". transmission_detail is the listing's own wording.
6. Flags carry meaning for a buyer, so be exact. accident_history requires a stated accident, collision, damage entry, total-loss history or accident repair — a clean history report is not a flag. repaint includes partial repaints and refinished body panels, but not touch-ups, wraps or refinished wheels and trim. engine_replaced_or_rebuilt needs an engine swap, replacement, overhaul or rebuild, including pistons or rings replaced; bearings, seals, gaskets, timing components, an engine-out service, a reseal or a top-end refresh alone are service, not a rebuild. rust_or_corrosion covers rust, corrosion or bubbling noted anywhere on the car, including corrosion that has since been repaired. modified is set whenever modifications is non-empty. Modifications are non-factory changes to the car: aftermarket exhausts, intakes, wheels, suspension, lifts, tuning and ECUs, engine or gearbox swaps, body kits, wraps, aftermarket seats, steering wheels, shifters, gauges and audio. Not modifications: wear and service items (tyres, battery, brake pads, clutch, fluids, belts, hoses), like-for-like replacement parts, preventive repairs and reinforcements (a reinforced subframe, a replacement soft top), factory options, dealer-fitted factory accessories such as a Porsche Classic head unit, paint protection film and ceramic coatings. track_use requires actual track, HPDE, autocross, time-attack or race use — "track-inspired" equipment is not. needs_work covers mechanical or functional problems: faults, leaks, warning lights, inoperative or malfunctioning items, incomplete systems, a non-running car, failed emissions or safety tests, and work the seller says is needed or recommended (including tyres they recommend replacing). Cosmetic wear alone (chips, scratches, dents, curb rash, worn or cracked upholstery, sagging headliner, sticky buttons, peeling trim, broken sun visor) is not needs_work. service_records requires that service records, invoices, receipts or stamped books accompany the car or are shown in the listing, including "partial service records" — a history report, window sticker, Marti report, certificate of authenticity, dyno sheet or owner's manual is not a service record.

7. Owners and tenure. owners is a stated or directly countable total: "one-owner" → 1, "two owners from new" → 2, "purchased new by the seller" → 1, "bought by the seller from the original owner" → 2, "acquired from its first owner" → 2. "Same family since new", "two owners since import" or a partial history are not totals → null. years_owned is how long the current owner has had the car: stated ("24-Years-Owned", "30-Years-Owned") or the auction close year minus a stated purchase year ("acquired in 2013" with a 2026 close → 13; "imported by the seller in 2022" → 4). A dealer that bought the car to resell is the current owner ("acquired by the selling dealer in 2026" → 0); when a dealer sells on an owner's behalf, use the owner. "Purchased new" or "recently acquired" without a year gives no years_owned, and an import date that doesn't say who imported the car is not a purchase year. Do not derive owners from a tenure or vice versa.

8. Title status comes only from title language: "clean title" → clean; "salvage title" → salvage; "rebuilt title" → rebuilt (when both salvage and rebuilt brands are listed, the car is rebuilt); bill of sale, bonded title, or sold on a registration or export certificate because no title exists → other. A plain "a Texas title", a duplicate title, a lien, a clean Carfax, or an odometer notation such as "Exempt" or "Not Actual" says nothing about title status → null.

9. The summary is one or two neutral sentences of at most 240 characters covering spec, ownership history and condition, in that order of priority. Only facts present in the text. No sale price or bid amount, no superlatives or sales language, no restating the year, make and model that the title already gives. Numbers in the summary must appear in the listing.
10. When a field is not stated, use null (or false for mileage_tmu, and an empty array for lists). Never guess.

Worked example 1

Input
<title>24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed</title>
<car>Porsche 911 — 964 Carrera (1989–1994)</car>
<auction_closed>2026-09-15</auction_closed>
<essentials>
- Chassis: WP0CB2962LS471196
- 115k Miles Shown on Repaired Odometer
- 3.6-Liter Flat-Six
- Five-Speed Manual Transaxle
- Slate Grey Metallic Paint
- Linen Gray Leather Upholstery
- 17" Turbo Twist-style Wheels
- Replacement Gray Soft Top
- Clean Carfax Report
</essentials>
<description>
This 1990 Porsche 911 Carrera 2 cabriolet was purchased by the current owner in 2002 and was specified in Slate Grey Metallic over Silk Grey Special leather with a limited-slip differential. The odometer was repaired in 2009 and shows 115k miles, approximately 40k of which were added by the seller. An engine-out service was completed in 2020, and the aftermarket 17" Turbo Twist-style wheels wear Michelin tires. The soft top was replaced in 2007. Manufacturer's literature, two sets of keys and service records will accompany the car. The Carfax report is free of accidents or other reported damage.
</description>

Output
{"mileage":115000,"mileage_unit":"mi","mileage_tmu":true,"exterior_color":"Slate Grey Metallic","color_family":"grey","interior_color":"Linen Gray","transmission":"manual","transmission_detail":"Five-Speed Manual Transaxle","engine":"3.6-Liter Flat-Six","owners":null,"years_owned":24,"title_status":null,"flags":["modified","service_records"],"modifications":["aftermarket 17\\" Turbo Twist-style wheels"],"notable_options":["limited-slip differential"],"summary":"Slate Grey Metallic over gray leather with a five-speed manual and limited-slip differential; one owner since 2002, 115k miles shown on a repaired odometer, engine-out service in 2020, records included."}

Worked example 2

Input
<title>2004 Ferrari 360 Modena F1</title>
<car>Ferrari 360 — 360 Modena / Spider (1999–2005)</car>
<auction_closed>2026-03-02</auction_closed>
<essentials>
- Chassis: ZFFYU51A140137000
- 31k Miles Shown
- 3.6-Liter V8
- Six-Speed F1 Automated Manual Transaxle
- Rosso Corsa Paint
- Nero Leather Upholstery
- Tubi Exhaust System
- Clean Title
</essentials>
<description>
This 2004 Ferrari 360 Modena is finished in Rosso Corsa over Nero leather and is powered by a 3.6-liter V8 paired with a six-speed F1 automated manual transaxle. The car was acquired by the selling dealer in 2025 and has 31k miles. Modifications include a Tubi exhaust system and Challenge-style rear grilles. The Carfax report lists an accident in 2011 with damage to the front, and the front bumper was subsequently repainted. The timing belts were replaced in 2023. The check-engine light is illuminated, which the seller attributes to a faulty oxygen sensor. Service records are not included.
</description>

Output
{"mileage":31000,"mileage_unit":"mi","mileage_tmu":false,"exterior_color":"Rosso Corsa","color_family":"red","interior_color":"Nero","transmission":"automatic","transmission_detail":"Six-Speed F1 Automated Manual Transaxle","engine":"3.6-Liter V8","owners":null,"years_owned":1,"title_status":"clean","flags":["accident_history","repaint","modified","needs_work"],"modifications":["Tubi exhaust system","Challenge-style rear grilles"],"notable_options":[],"summary":"Rosso Corsa over Nero leather with the F1 gearbox and a Tubi exhaust; 31k miles, timing belts done in 2023, a 2011 front-end accident with a repainted bumper, and an illuminated check-engine light."}`;

/** The per-sale user message. Deterministic for a given input. */
export function buildUserMessage(input: ExtractionInput): string {
  const essentials = input.essentials.length
    ? input.essentials.map((e) => `- ${e}`).join("\n")
    : "(not available for this listing)";
  const description = input.description.trim() || "(not available for this listing)";
  return [
    `<title>${input.title.trim()}</title>`,
    `<car>${input.car ?? "unknown"}</car>`,
    `<auction_closed>${input.closedOn ?? "unknown"}</auction_closed>`,
    `<essentials>\n${essentials}\n</essentials>`,
    `<description>\n${description}\n</description>`,
  ].join("\n");
}

/**
 * Fingerprint of everything that determines an extraction's output: the
 * prompt version, the model and the exact input text. Stored with each row so
 * unchanged inputs are never re-extracted and changed prompts always are.
 */
export function extractionInputHash(input: ExtractionInput, model: string): string {
  return createHash("sha256")
    .update(PROMPT_VERSION)
    .update("\n")
    .update(model)
    .update("\n")
    .update(buildUserMessage(input))
    .digest("hex");
}
