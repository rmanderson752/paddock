// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentSalesFeed } from "./RecentSalesFeed";
import type { Sale } from "@/lib/types";

const base: Sale = {
  id: "s1",
  generationId: "g1",
  salePrice: 12_500_000,
  saleDate: "2026-09-01",
  source: "bat",
  sourceUrl: null,
  year: 1997,
  mileage: 29000,
  color: "Grand Prix White",
  conditionNotes: "Paint-to-sample Grand Prix White over Cashmere Beige with a six-speed manual; 29k miles.",
  sold: true,
  details: null,
};

describe("RecentSalesFeed", () => {
  it("renders a sale without extracted details the way it always has", () => {
    render(<RecentSalesFeed sales={[base]} />);
    expect(screen.getByText("1997 · 29,000 mi · Grand Prix White")).toBeTruthy();
    expect(screen.getByText(/Paint-to-sample/)).toBeTruthy();
    expect(screen.queryByText("Manual")).toBeNull();
  });

  it("shows gearbox, TMU, provenance and flags once details exist", () => {
    const sale: Sale = {
      ...base,
      details: {
        colorFamily: "white",
        mileageTmu: true,
        transmission: "manual",
        transmissionDetail: "Six-Speed Manual Transaxle",
        engine: null,
        owners: 1,
        yearsOwned: 12,
        titleStatus: "rebuilt",
        flags: ["accident_history", "service_records"],
        summary: "x",
      },
    };
    render(<RecentSalesFeed sales={[sale]} />);
    expect(screen.getByText("1997 · 29,000 mi (TMU) · Grand Prix White · Manual")).toBeTruthy();
    expect(screen.getByText(/One owner · 12 years owned · rebuilt title/)).toBeTruthy();
    expect(screen.getByText("Accident history")).toBeTruthy();
    expect(screen.getByText("Service records")).toBeTruthy();
  });
});
