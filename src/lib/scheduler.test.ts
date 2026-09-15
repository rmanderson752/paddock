import { describe, it, expect } from "vitest";
import { parseSchedule, nextRunAt, describeSchedule, DEFAULT_SCHEDULE } from "./scheduler";

describe("parseSchedule", () => {
  it("parses the default Monday/Thursday 00:01 schedule", () => {
    expect(parseSchedule(DEFAULT_SCHEDULE)).toEqual([
      { weekday: 1, hour: 0, minute: 1 },
      { weekday: 4, hour: 0, minute: 1 },
    ]);
  });

  it("accepts long weekday names and is case-insensitive", () => {
    expect(parseSchedule("Monday 6:30, THURSDAY 18:00")).toEqual([
      { weekday: 1, hour: 6, minute: 30 },
      { weekday: 4, hour: 18, minute: 0 },
    ]);
  });

  it("rejects malformed entries", () => {
    expect(() => parseSchedule("")).toThrow();
    expect(() => parseSchedule("mon")).toThrow();
    expect(() => parseSchedule("funday 00:01")).toThrow();
    expect(() => parseSchedule("mon 25:00")).toThrow();
  });
});

describe("nextRunAt", () => {
  const schedule = parseSchedule(DEFAULT_SCHEDULE);

  it("picks the coming Thursday when asked on a Tuesday", () => {
    const from = new Date(2026, 8, 15, 17, 30); // Tue Sep 15 2026, 17:30 local
    const next = nextRunAt(schedule, from);
    expect(next.getDay()).toBe(4);
    expect(next.getDate()).toBe(17);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(1);
  });

  it("picks Monday after Thursday's run", () => {
    const from = new Date(2026, 8, 17, 0, 1, 30); // just after Thu 00:01
    const next = nextRunAt(schedule, from);
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(21);
  });

  it("does not return the current minute", () => {
    const from = new Date(2026, 8, 21, 0, 1, 0); // exactly Mon 00:01:00
    const next = nextRunAt(schedule, from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    expect(next.getDay()).toBe(4);
  });

  it("handles a single entry a week away", () => {
    const only = parseSchedule("wed 09:00");
    const from = new Date(2026, 8, 16, 9, 0, 1); // Wed 09:00:01
    const next = nextRunAt(only, from);
    expect(next.getDate()).toBe(23);
    expect(next.getHours()).toBe(9);
  });
});

describe("describeSchedule", () => {
  it("renders a readable summary", () => {
    expect(describeSchedule(parseSchedule(DEFAULT_SCHEDULE))).toBe("Mon 00:01, Thu 00:01");
  });
});
