import { describe, it, expect } from "vitest";
import { pruneBoilerplate } from "./prune";

describe("pruneBoilerplate", () => {
  it("drops the gauge tour but keeps the odometer sentence in the same paragraph", () => {
    const { text, removed } = pruneBoilerplate(
      "The leather-wrapped steering wheel frames a 180-mph speedometer and a tachometer with a 6,800-rpm redline as well as gauges for oil pressure. The six-digit odometer shows 115k miles. The odometer was repaired in 2023."
    );
    expect(removed).toHaveLength(1);
    expect(text).toBe("The six-digit odometer shows 115k miles. The odometer was repaired in 2023.");
  });

  it("drops factory ratings and gallery pointers but keeps ones that carry evidence", () => {
    const { text } = pruneBoilerplate(
      "The 3.6-liter flat-six was factory rated at 282 horsepower and 250 lb-ft of torque. An engine-out service was completed in 2020, an invoice for which can be seen in the gallery below. Additional photos of the underside are provided in the gallery. A photo highlighting corrosion on the underside is provided in the gallery."
    );
    expect(text).toBe(
      "An engine-out service was completed in 2020, an invoice for which can be seen in the gallery below. A photo highlighting corrosion on the underside is provided in the gallery."
    );
  });

  it("keeps tire sentences that mention aftermarket parts or a recommendation", () => {
    const { text } = pruneBoilerplate(
      "The 15″ US Mags Indy wheels are mounted with BFGoodrich tires. The aftermarket 17″ Turbo Twist-style wheels are wrapped in Michelin tires. The wheels are mounted with mismatched tires that the seller recommends replacing."
    );
    expect(text).toBe(
      "The aftermarket 17″ Turbo Twist-style wheels are wrapped in Michelin tires. The wheels are mounted with mismatched tires that the seller recommends replacing."
    );
  });

  it("removes empty decoding stubs and whole paragraphs that end up empty", () => {
    const { text } = pruneBoilerplate("First paragraph stays.\n\nDecoding the option sticker reveals the following information:\n\nThe Carfax report is free of accidents.");
    expect(text).toBe("First paragraph stays.\n\nThe Carfax report is free of accidents.");
  });

  it("leaves ordinary prose alone", () => {
    const prose = "This 1997 Porsche 911 Turbo was purchased by the seller in 2019. It is finished in Guards Red over black leather.";
    expect(pruneBoilerplate(prose)).toEqual({ text: prose, removed: [] });
  });
});
