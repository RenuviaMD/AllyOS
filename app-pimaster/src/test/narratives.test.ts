import { describe, expect, it } from "vitest";
import { aggravationNarrative, injuryNarrative, imagingReviewNarrative } from "../lib/narratives";
import { emptyForm } from "../lib/types";

describe("injuryNarrative", () => {
  it("builds a narrative from accident answers", () => {
    const f = emptyForm();
    f.patient.firstName = "Test";
    f.patient.lastName = "Patient";
    f.accident = {
      accidentDate: "2026-06-01",
      accidentType: "MVA",
      ticketed: "no",
      role: "Driver",
      seatbelt: "yes",
      airbag: "yes",
      vehicleDrivable: "no",
      priorMedical: "no",
    };
    const n = injuryNarrative(f.patient, f.accident);
    expect(n).toContain("motor vehicle accident");
    expect(n).toContain("2026-06-01");
    expect(n).toContain("driver");
    expect(n).toContain("seatbelt");
    expect(n).toContain("not drivable");
  });

  it("is empty when nothing entered", () => {
    const f = emptyForm();
    expect(injuryNarrative(f.patient, f.accident)).toBe("");
  });
});

describe("aggravationNarrative", () => {
  it("references the previous condition when aggravated", () => {
    const f = emptyForm();
    f.pmh.aggravatedPrevious = "yes";
    f.pmh.previousConditionDx = "lumbar disc herniation";
    expect(aggravationNarrative(f.pmh, "MVA")).toContain("This MVA aggravated");
    expect(aggravationNarrative(f.pmh, "MVA")).toContain("lumbar disc herniation");
  });
  it("is empty when not aggravated", () => {
    const f = emptyForm();
    expect(aggravationNarrative(f.pmh, "MVA")).toBe("");
  });
});

describe("imagingReviewNarrative", () => {
  it("lists reviewed studies and discussion", () => {
    const n = imagingReviewNarrative({
      images: [
        { name: "c-spine.pdf", reviewed: true },
        { name: "knee.pdf", reviewed: false },
      ],
      findings: "Straightening of cervical lordosis.",
      discussed: "yes",
    });
    expect(n).toContain("c-spine.pdf");
    expect(n).not.toContain("knee.pdf");
    expect(n).toContain("discussed with the patient");
  });
});
