import { describe, expect, it } from "vitest";
import { aggravationNarrative, injuryNarrative, imagingReviewNarrative } from "../lib/narratives";
import { emptyForm } from "../lib/types";

describe("injuryNarrative", () => {
  it("writes a clinical HPI — age/sex descriptor, never the patient's name", () => {
    const f = emptyForm();
    f.patient.firstName = "Test";
    f.patient.lastName = "Patient";
    f.patient.dob = "1966-05-07";
    f.patient.sex = "male";
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
    const n = injuryNarrative(f.patient, f.accident, { visitDate: "2026-06-03", visitType: "initial" });
    expect(n).toContain("The patient is a 60-year-old male who presents for initial evaluation");
    expect(n).not.toContain("Test");
    expect(n).not.toContain("Patient Patient");
    expect(n).toContain("motor vehicle collision");
    expect(n).toContain("06/01/2026"); // dates in US clinical format
    expect(n).toContain("he was the driver of the vehicle");
    expect(n).toContain("restrained by a seatbelt");
    expect(n).toContain("airbags deployed");
    expect(n).toContain("disabled and could not be driven");
    expect(n).toContain("No citation was issued");
    expect(n).toContain("has not received medical evaluation or treatment");
  });

  it("degrades gracefully without DOB/sex and never invents them", () => {
    const f = emptyForm();
    f.accident.accidentDate = "2026-06-01";
    f.accident.accidentType = "Fall";
    const n = injuryNarrative(f.patient, f.accident, { visitDate: "2026-06-03", visitType: "initial" });
    expect(n).toContain("The patient presents for initial evaluation");
    expect(n).toContain("a fall");
    expect(n).not.toContain("year-old");
    // no mechanism details entered → no fabricated sentences
    expect(n).not.toContain("seatbelt");
    expect(n).not.toContain("citation");
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
