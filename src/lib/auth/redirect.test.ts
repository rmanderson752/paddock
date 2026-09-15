import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("allows same-origin paths", () => {
    expect(safeRedirectPath("/watchlist")).toBe("/watchlist");
    expect(safeRedirectPath("/car/porsche/911/993-turbo")).toBe("/car/porsche/911/993-turbo");
  });

  it("falls back for missing or non-string values", () => {
    expect(safeRedirectPath(null)).toBe("/portfolio");
    expect(safeRedirectPath(undefined, "/")).toBe("/");
    expect(safeRedirectPath("")).toBe("/portfolio");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/portfolio");
    expect(safeRedirectPath("//evil.example")).toBe("/portfolio");
    expect(safeRedirectPath("/\\evil.example")).toBe("/portfolio");
  });

  it("does not bounce back to the auth pages", () => {
    expect(safeRedirectPath("/login")).toBe("/portfolio");
    expect(safeRedirectPath("/signup?x=1")).toBe("/portfolio");
  });
});
