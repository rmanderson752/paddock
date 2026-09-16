import { describe, it, expect } from "vitest";
import { gradeCase, aggregate, fuzzyEquals, phraseMatches, gradeSummary } from "./grade";
import type { ExtractedListing, ExtractionInput } from "./schema";

const input: ExtractionInput = {
  title: "24-Years-Owned 1990 Porsche 911 Carrera 2 Cabriolet 5-Speed",
  essentials: ["115k Miles Shown on Repaired Odometer", "Slate Grey Metallic Paint", "Five-Speed Manual Transaxle"],
  description: "Purchased by the current owner in 2002. An engine-out service was completed in 2020.",
  closedOn: "2026-09-15",
  car: null,
};

const predicted: ExtractedListing = {
  mileage: 115000,
  mileage_unit: "mi",
  mileage_tmu: true,
  exterior_color: "Slate Grey Metallic Paint",
  color_family: "grey",
  interior_color: "Linen Gray",
  transmission: "manual",
  transmission_detail: "Five-Speed Manual Transaxle",
  engine: null,
  owners: 3,
  years_owned: 24,
  title_status: null,
  flags: ["modified", "service_records"],
  modifications: ["aftermarket 17-inch Turbo Twist-style wheels"],
  notable_options: [],
  summary: "Slate Grey Metallic with a five-speed manual; one owner since 2002, 115k miles on a repaired odometer, engine-out service in 2020.",
};

describe("matching helpers", () => {
  it("fuzzyEquals ignores case, punctuation and a trailing qualifier", () => {
    expect(fuzzyEquals("Slate Grey Metallic", "slate grey metallic paint")).toBe(true);
    expect(fuzzyEquals("Guards Red", "Arena Red")).toBe(false);
  });
  it("phraseMatches accepts half-overlapping short phrases", () => {
    expect(phraseMatches("aftermarket wheels", "aftermarket 17-inch Turbo Twist-style wheels")).toBe(true);
    expect(phraseMatches("lowering springs", "Tubi exhaust")).toBe(false);
  });
});

describe("gradeCase", () => {
  const grade = gradeCase(
    {
      mileage: 115000,
      mileage_tmu: true,
      exterior_color: "Slate Grey Metallic",
      color_family: "grey",
      transmission: "manual",
      engine: "3.6-Liter Flat-Six",
      owners: null,
      years_owned: 24,
      title_status: null,
      flags: ["service_records"],
      modifications: ["aftermarket wheels"],
    },
    predicted,
    input
  );

  it("grades only the fields the label asserts", () => {
    const fields = Object.fromEntries(grade.fields.map((f) => [f.field, f.outcome]));
    expect(fields).toEqual({
      mileage: "correct",
      mileage_tmu: "correct",
      color_family: "correct",
      transmission: "correct",
      owners: "false_positive",
      years_owned: "correct",
      title_status: "correct",
      exterior_color: "correct",
      engine: "false_negative",
    });
    expect(grade.fields.find((f) => f.field === "interior_color")).toBeUndefined();
  });

  it("scores flags as a set and lists softly", () => {
    expect(grade.flags).toMatchObject({ tp: ["service_records"], fp: ["modified"], fn: [] });
    expect(grade.lists[0]).toMatchObject({ matchedExpected: 1, matchedPredicted: 1 });
  });

  it("checks the summary for length, sentences, price and grounded numbers", () => {
    expect(grade.summary).toMatchObject({ withinLength: true, atMostTwoSentences: true, noPrice: true, numbersGrounded: true });
  });
});

describe("gradeSummary", () => {
  it("flags numbers that don't appear in the listing and price talk", () => {
    const s = gradeSummary("Sold for $45,500 with 120k miles and a 2019 service.", input);
    expect(s.noPrice).toBe(false);
    expect(s.numbersGrounded).toBe(false);
    expect(s.ungroundedNumbers).toEqual(["45,500", "120k", "2019"]);
  });
  it("treats 115k and 115,000 as the same number", () => {
    expect(gradeSummary("Shows 115,000 miles.", input).numbersGrounded).toBe(true);
  });
});

describe("aggregate", () => {
  it("rolls per-field outcomes into accuracy, precision and recall", () => {
    const g1 = gradeCase({ mileage: 1000, color_family: "red", flags: ["repaint"] }, { ...predicted, mileage: 1000, color_family: "red", flags: ["repaint"] }, input);
    const g2 = gradeCase({ mileage: null, color_family: "blue", flags: [] }, { ...predicted, mileage: 5, color_family: "red", flags: ["repaint"] }, input);
    const agg = aggregate([g1, g2]);
    const mileage = agg.fields.find((f) => f.field === "mileage")!;
    expect(mileage).toMatchObject({ n: 2, correct: 1, falsePositive: 1, precision: 0.5, recall: 1 });
    const family = agg.fields.find((f) => f.field === "color_family")!;
    expect(family).toMatchObject({ n: 2, correct: 1, wrongValue: 1, accuracy: 0.5 });
    expect(agg.flags).toMatchObject({ precision: 0.5, recall: 1, exactSetAccuracy: 0.5 });
    expect(agg.coreScore).toBeGreaterThan(0);
    expect(agg.coreScore).toBeLessThan(1);
  });
});
