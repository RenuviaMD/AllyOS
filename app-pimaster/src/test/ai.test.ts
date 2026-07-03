import { describe, expect, it } from "vitest";
import { narrativeFacts } from "../lib/ai";
import { buildClinicalNoteHtml } from "../lib/report";
import { emptyForm } from "../lib/types";

function filledForm() {
  const f = emptyForm();
  f.patient.firstName = "Armando";
  f.patient.lastName = "Falcon";
  f.patient.dob = "1966-05-07";
  f.patient.sex = "male";
  f.patient.address = "515 Leffingwell Avenue";
  f.patient.phone = "3053333973";
  f.patient.policyNumber = "111111111111";
  f.patient.claimNumber = "CL-999";
  f.visitDate = "2026-07-03";
  f.accident.accidentDate = "2026-06-20";
  f.accident.accidentType = "MVA";
  f.accident.role = "Driver";
  f.ai = { hpiNotes: "neck pain since day after, radiates to L shoulder", hpiDraft: "" };
  return f;
}

describe("narrativeFacts — PHI minimization contract", () => {
  it("carries initials + clinical facts, never identifiers", () => {
    const facts = narrativeFacts(filledForm());
    const json = JSON.stringify(facts);
    expect(facts.patientInitials).toBe("AF");
    expect(facts.age).toBe(60);
    expect(json).not.toContain("Armando");
    expect(json).not.toContain("Falcon");
    expect(json).not.toContain("1966-05-07"); // DOB never leaves — only computed age
    expect(json).not.toContain("Leffingwell");
    expect(json).not.toContain("3053333973");
    expect(json).not.toContain("111111111111");
    expect(json).not.toContain("CL-999");
    expect(json).toContain("neck pain"); // physician notes DO travel
    expect(json).toContain("2026-06-20"); // accident date is clinical context
  });

  it("omits absent facts instead of sending empties", () => {
    const facts = narrativeFacts(emptyForm());
    expect(facts.age).toBeUndefined();
    expect(facts.sex).toBeUndefined();
    expect(facts.physicianNotes).toBeUndefined();
  });
});

describe("note HPI precedence", () => {
  it("prints the physician-reviewed AI draft when present, else the rule-based narrative", () => {
    const f = filledForm();
    f.ai!.hpiDraft = "The patient is a 60-year-old male with post-collision cervicalgia radiating to the left shoulder.";
    let html = buildClinicalNoteHtml(f);
    expect(html).toContain("post-collision cervicalgia");
    expect(html).not.toContain("who presents for initial evaluation of injuries sustained"); // rule-based suppressed

    f.ai!.hpiDraft = "";
    html = buildClinicalNoteHtml(f);
    expect(html).toContain("The patient is a 60-year-old male who presents for initial evaluation");
  });
});
