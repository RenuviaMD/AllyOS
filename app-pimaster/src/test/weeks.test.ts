import { describe, expect, it } from "vitest";
import { buildTimeline, daysSinceAccident, weekBounds, weekNumber } from "../lib/weeks";

describe("weekBounds", () => {
  it("returns Sunday–Saturday for a midweek date", () => {
    // 2026-06-11 is a Thursday
    expect(weekBounds("2026-06-11")).toEqual({ start: "2026-06-07", end: "2026-06-13" });
  });
  it("handles a Sunday as the week start", () => {
    expect(weekBounds("2026-06-07")).toEqual({ start: "2026-06-07", end: "2026-06-13" });
  });
});

describe("daysSinceAccident", () => {
  it("counts the accident day as Day 1", () => {
    expect(daysSinceAccident("2026-06-01", "2026-06-01")).toBe(1);
    expect(daysSinceAccident("2026-06-01", "2026-06-07")).toBe(7);
  });
});

describe("weekNumber", () => {
  it("is week 1 during the accident week and increments on Sundays", () => {
    expect(weekNumber("2026-06-11", "2026-06-12")).toBe(1);
    expect(weekNumber("2026-06-11", "2026-06-14")).toBe(2); // next Sunday
  });
});

describe("buildTimeline", () => {
  it("labels day 1 as the day of injury and runs through the end date", () => {
    const t = buildTimeline("2026-06-01", "2026-06-04");
    expect(t).toHaveLength(4);
    expect(t[0].label).toBe("Day of Injury");
    expect(t[3]).toMatchObject({ date: "2026-06-04", dayNumber: 4 });
  });
});
