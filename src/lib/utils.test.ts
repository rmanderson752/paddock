import { describe, it, expect } from "vitest";
import { formatPrice, formatPriceShort, formatTrend, formatDate, timeAgo, cn } from "./utils";

describe("formatPrice", () => {
  it("formats cents to USD currency string", () => {
    expect(formatPrice(12345600)).toBe("$123,456");
    expect(formatPrice(0)).toBe("$0");
    expect(formatPrice(99)).toBe("$1"); // rounds
  });
});

describe("formatPriceShort", () => {
  it("abbreviates large values", () => {
    expect(formatPriceShort(150000000)).toBe("$1.5M");
    expect(formatPriceShort(25000000)).toBe("$250k");
    expect(formatPriceShort(50000)).toBe("$500");
  });
});

describe("formatTrend", () => {
  it("adds a sign and one decimal", () => {
    expect(formatTrend(12.345)).toBe("+12.3%");
    expect(formatTrend(-3)).toBe("-3.0%");
    expect(formatTrend(0)).toBe("+0.0%");
  });
});

describe("formatDate", () => {
  it("formats ISO dates without timezone drift", () => {
    expect(formatDate("2026-03-17")).toBe("Mar 17, 2026");
    expect(formatDate("2026-01-01")).toBe("Jan 1, 2026");
  });
  it("passes through unparseable input", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  it("is relative for recent dates and absolute for old ones", () => {
    expect(timeAgo("2026-09-15", now)).toBe("today");
    expect(timeAgo("2026-09-14", now)).toBe("yesterday");
    expect(timeAgo("2026-09-10", now)).toBe("5d ago");
    expect(timeAgo("2026-08-25", now)).toBe("3w ago");
    expect(timeAgo("2026-03-17", now)).toBe("Mar 17, 2026");
  });
});

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
