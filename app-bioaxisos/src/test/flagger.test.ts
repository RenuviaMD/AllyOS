import { describe, expect, it } from "vitest";
import { evaluateCheckIn } from "@/lib/checkin/flagger";

describe("check-in flagger (spec §5.4)", () => {
  it("does not flag a routine check-in", () => {
    expect(evaluateCheckIn({ painScore: 3, freeText: "feeling good, sleeping well" })).toEqual({
      flagged: false,
      reasons: [],
    });
  });

  it("flags pain score >= 7", () => {
    expect(evaluateCheckIn({ painScore: 7 }).reasons).toContain("pain_ge_7");
    expect(evaluateCheckIn({ painScore: 9 }).flagged).toBe(true);
    expect(evaluateCheckIn({ painScore: 6 }).flagged).toBe(false);
  });

  it("flags a reported new mass / lump", () => {
    expect(evaluateCheckIn({ freeText: "I noticed a new lump on my neck" }).reasons).toContain(
      "new_mass",
    );
    expect(evaluateCheckIn({ freeText: "there is a new mass near the site" }).flagged).toBe(true);
  });

  it("flags severe abdominal pain", () => {
    expect(
      evaluateCheckIn({ freeText: "severe abdominal pain since yesterday" }).reasons,
    ).toContain("severe_abdominal_pain");
    expect(evaluateCheckIn({ freeText: "my stomach pain is unbearable" }).flagged).toBe(true);
  });

  it("can trigger multiple reasons at once", () => {
    const r = evaluateCheckIn({ painScore: 8, freeText: "new lump and severe abdominal pain" });
    expect(r.flagged).toBe(true);
    expect(r.reasons).toEqual(
      expect.arrayContaining(["pain_ge_7", "new_mass", "severe_abdominal_pain"]),
    );
  });

  it("does not flag benign similar words", () => {
    expect(evaluateCheckIn({ freeText: "had a relaxing massage today" }).flagged).toBe(false);
  });
});
