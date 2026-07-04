import { describe, expect, it } from "vitest";
import { MD_PHASES, MD_SIGN_PHASE, phaseForSection, phasesFor, STAFF_PHASES } from "../lib/encounter";

describe("encounter stepper phases (U3)", () => {
  it("physician gets the five-phase MD visit; staff keeps a 2-step intake; PT has no stepper", () => {
    expect(phasesFor("physician")).toEqual(["History", "Exam", "Assessment", "Plan", "Sign"]);
    expect(phasesFor("staff")).toEqual(["Check-In", "Accident & Consent"]);
    expect(phasesFor("pt")).toEqual([]);
  });

  it("maps every physician chart section into a phase (preserving the section model)", () => {
    // History
    expect(phaseForSection("physician", 1)).toBe(0);
    expect(phaseForSection("physician", 2)).toBe(0);
    expect(phaseForSection("physician", 3)).toBe(0);
    // Exam
    expect(phaseForSection("physician", 4)).toBe(1);
    expect(phaseForSection("physician", 5)).toBe(1);
    // Assessment (dx + imaging review)
    expect(phaseForSection("physician", 6)).toBe(2);
    expect(phaseForSection("physician", 9)).toBe(2);
    // Plan (plan + image orders + discharge)
    expect(phaseForSection("physician", 7)).toBe(3);
    expect(phaseForSection("physician", 8)).toBe(3);
    expect(phaseForSection("physician", 10)).toBe(3);
  });

  it("no clinical section maps into Sign — Sign is the gate, not a form", () => {
    for (let s = 1; s <= 12; s++) {
      expect(phaseForSection("physician", s)).not.toBe(MD_SIGN_PHASE);
    }
    expect(MD_SIGN_PHASE).toBe(MD_PHASES.length - 1);
  });

  it("staff sections split Check-In vs Accident", () => {
    expect(phaseForSection("staff", 1)).toBe(0);
    expect(phaseForSection("staff", 2)).toBe(1);
    expect(STAFF_PHASES).toHaveLength(2);
  });

  it("PT sections never map to a phase", () => {
    expect(phaseForSection("pt", 11)).toBeUndefined();
    expect(phaseForSection("pt", 12)).toBeUndefined();
  });
});
