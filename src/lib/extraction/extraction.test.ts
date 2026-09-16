import { describe, it, expect } from "vitest";
import { buildUserMessage, extractionInputHash, SYSTEM_PROMPT } from "./prompt";
import { normalize, buildRequest, interpretMessage, ExtractionError } from "./extract";
import { ExtractedListingSchema, PROMPT_VERSION, type ExtractedListing, type ExtractionInput } from "./schema";
import { estimateCostUsd } from "./pricing";
import { excerptToNotes } from "../scraper/bat";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

const input: ExtractionInput = {
  title: "1997 Porsche 911 Turbo",
  essentials: ["Chassis: WP0AC2999VS375000", "29k Miles Shown", "Six-Speed Manual Transaxle"],
  description: "This 1997 Porsche 911 Turbo shows 29k miles.",
  closedOn: "2026-09-01",
  car: "Porsche 911 — 993 Turbo (1995–1998)",
};

const sample: ExtractedListing = {
  mileage: 29000,
  mileage_unit: "mi",
  mileage_tmu: false,
  exterior_color: " Arena Red Metallic ",
  color_family: "red",
  interior_color: null,
  transmission: "manual",
  transmission_detail: "Six-Speed Manual Transaxle",
  engine: null,
  owners: null,
  years_owned: null,
  title_status: null,
  flags: [],
  modifications: ["aftermarket exhaust", "aftermarket exhaust "],
  notable_options: [],
  summary: "Arena Red over black with a six-speed manual; 29k miles.",
};

describe("prompt", () => {
  it("system prompt is static and has no per-request content", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(2000);
  });

  it("user message is deterministic and carries every input part", () => {
    const m = buildUserMessage(input);
    expect(m).toBe(buildUserMessage({ ...input }));
    expect(m).toContain("<title>1997 Porsche 911 Turbo</title>");
    expect(m).toContain("- 29k Miles Shown");
    expect(m).toContain("<auction_closed>2026-09-01</auction_closed>");
    expect(m).toContain("<car>Porsche 911 — 993 Turbo (1995–1998)</car>");
  });

  it("marks missing sections instead of leaving them blank", () => {
    const m = buildUserMessage({ ...input, essentials: [], description: "  ", car: null, closedOn: null });
    expect(m).toContain("(not available for this listing)");
    expect(m).toContain("<car>unknown</car>");
  });

  it("input hash changes with the text, the model and the prompt version", () => {
    const a = extractionInputHash(input, "claude-opus-5");
    expect(a).toBe(extractionInputHash(input, "claude-opus-5"));
    expect(a).not.toBe(extractionInputHash(input, "claude-sonnet-5"));
    expect(a).not.toBe(extractionInputHash({ ...input, description: "x" }, "claude-opus-5"));
    expect(PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it("request caches the system prompt and asks for the schema", () => {
    const req = buildRequest(input, "claude-opus-5", "medium");
    expect(Array.isArray(req.system) && req.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(req.output_config?.format?.type).toBe("json_schema");
    expect(req.output_config?.effort).toBe("medium");
    const schema = req.output_config?.format?.schema as { required?: string[]; additionalProperties?: boolean };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain("summary");
  });
});

describe("normalize", () => {
  it("trims names, dedupes lists and derives the modified flag", () => {
    const out = normalize(sample);
    expect(out.exterior_color).toBe("Arena Red Metallic");
    expect(out.modifications).toEqual(["aftermarket exhaust"]);
    expect(out.flags).toEqual(["modified"]);
  });

  it("keeps unit and family consistent with their value", () => {
    const out = normalize({ ...sample, mileage: null, mileage_unit: "mi", exterior_color: null, color_family: "red" });
    expect(out.mileage_unit).toBeNull();
    expect(out.color_family).toBeNull();
    expect(normalize({ ...sample, mileage: 1200, mileage_unit: null }).mileage_unit).toBe("mi");
  });

  it("caps the summary at a sentence boundary", () => {
    const long = "First sentence about the car and its history in some detail. " + "Second sentence with more words about condition and records. " + "Third sentence that pushes well past the three hundred and twenty character limit for a summary, with a great many extra words to make sure of it, more than enough to be certain, padded further still, and then some more.";
    const out = normalize({ ...sample, summary: long });
    expect(out.summary.length).toBeLessThanOrEqual(320);
    expect(out.summary.endsWith(".")).toBe(true);
    expect(out.summary).not.toContain("and then some more");
  });

  it("closes a clause-level cut with a period instead of a dangling semicolon", () => {
    const long = "Grand Prix White over black leather with the G50 five-speed and a limited-slip differential; owned since 1996, 149k miles, engine rebuilt in 2015 with a GT35R turbo and larger intercooler, gearbox rebuilt in 2018, panels repainted, valve-cover oil leak noted, records included, and a long tail of further detail about the tyres";
    const out = normalize({ ...sample, summary: long });
    expect(out.summary.length).toBeLessThanOrEqual(320);
    expect(out.summary.endsWith(".")).toBe(true);
    expect(out.summary).not.toMatch(/[;,]\.$/);
  });
});

function fakeMessage(text: string, stop: Message["stop_reason"] = "end_turn"): Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [{ type: "text", text, citations: null }],
    stop_reason: stop,
    stop_sequence: null,
    usage: {
      input_tokens: 1200,
      output_tokens: 300,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 2000,
      cache_creation: null,
      server_tool_use: null,
      service_tier: null,
      inference_geo: null,
      output_tokens_details: null,
    },
    context_management: null,
    stop_details: null,
  } as unknown as Message;
}

describe("interpretMessage", () => {
  it("validates, normalizes and prices a good response", () => {
    const r = interpretMessage(fakeMessage(JSON.stringify(sample)), input, "claude-opus-5", 850);
    expect(r.data.flags).toEqual(["modified"]);
    expect(r.promptVersion).toBe(PROMPT_VERSION);
    expect(r.usage.cacheReadTokens).toBe(2000);
    // 1200 × $5 + 2000 × $0.5 + 300 × $25 per MTok
    expect(r.costUsd).toBeCloseTo(0.006 + 0.001 + 0.0075, 6);
    expect(r.latencyMs).toBe(850);
  });

  it("classifies truncation, bad JSON, schema misses and refusals", () => {
    const truncated = fakeMessage(JSON.stringify(sample).slice(0, 40), "max_tokens");
    expect(() => interpretMessage(truncated, input, "claude-opus-5", 0)).toThrow(ExtractionError);
    try {
      interpretMessage(truncated, input, "claude-opus-5", 0);
    } catch (e) {
      expect((e as ExtractionError).kind).toBe("truncated");
    }
    try {
      interpretMessage(fakeMessage("not json"), input, "claude-opus-5", 0);
    } catch (e) {
      expect((e as ExtractionError).kind).toBe("unparseable");
    }
    try {
      interpretMessage(fakeMessage(JSON.stringify({ ...sample, transmission: "cvt" })), input, "claude-opus-5", 0);
    } catch (e) {
      expect((e as ExtractionError).kind).toBe("invalid");
    }
    try {
      interpretMessage(fakeMessage("", "refusal"), input, "claude-opus-5", 0);
    } catch (e) {
      expect((e as ExtractionError).kind).toBe("refusal");
    }
  });

  it("halves the cost for batch results", () => {
    const r = interpretMessage(fakeMessage(JSON.stringify(sample)), input, "claude-opus-5", 0, true);
    expect(r.costUsd).toBeCloseTo((0.006 + 0.001 + 0.0075) / 2, 6);
  });
});

describe("pricing", () => {
  it("returns null for unknown models rather than a wrong number", () => {
    expect(estimateCostUsd("claude-unknown", { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 })).toBeNull();
  });
});

describe("schema", () => {
  it("accepts the worked-example shape and rejects unknown enum values", () => {
    expect(ExtractedListingSchema.safeParse(sample).success).toBe(true);
    expect(ExtractedListingSchema.safeParse({ ...sample, color_family: "teal" }).success).toBe(false);
    expect(ExtractedListingSchema.safeParse({ ...sample, flags: ["shiny"] }).success).toBe(false);
  });
});

describe("excerptToNotes", () => {
  it("keeps whole sentences from a mid-word cut excerpt", () => {
    const excerpt = "This 1997 Porsche 911 Turbo received a ~$44k service in 2022. The car is finished in Arctic Si";
    expect(excerptToNotes(excerpt)).toBe("This 1997 Porsche 911 Turbo received a ~$44k service in 2022.");
  });
  it("cuts at a word with an ellipsis when there is no complete sentence", () => {
    const excerpt = "This black-over-black 1997 Porsche 911 Turbo is powered by a twin-turbocharged flat-six that has been rebuilt to a 3.8-liter displacement and fitted with a tune";
    const notes = excerptToNotes(excerpt)!;
    expect(notes.endsWith("…")).toBe(true);
    expect(notes).not.toContain("tune…");
  });
  it("ignores very short excerpts", () => {
    expect(excerptToNotes("Nice car.")).toBeNull();
  });
});
