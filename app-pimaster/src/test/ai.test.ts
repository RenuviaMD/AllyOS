import { describe, expect, it } from "vitest";
import { narrativeFacts, reportFacts } from "../lib/ai";
import { buildClinicalNoteHtml, finalizeAiReport } from "../lib/report";
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

describe("reportFacts — full-report PHI contract", () => {
  it("carries the whole clinical picture but no identifiers", () => {
    const f = filledForm();
    f.patient.insuranceCarrier = "State Farm";
    f.spineExam.cervical = { tenderness: "yes", spasm: "yes", rom: "limited" };
    f.plan.modalities = ["97110"];
    const json = JSON.stringify(reportFacts(f));
    expect(json).toContain("cervical");
    expect(json).toContain("telehealth" === f.visitMode ? "telehealth" : "inPerson");
    expect(json).toContain("State Farm"); // carrier is claim context, not an identifier
    expect(json).not.toContain("Armando");
    expect(json).not.toContain("Falcon");
    expect(json).not.toContain("1966-05-07");
    expect(json).not.toContain("Leffingwell");
    expect(json).not.toContain("111111111111");
    expect(json).not.toContain("CL-999");
  });
});

describe("finalizeAiReport", () => {
  it("substitutes placeholders and strips the missing-items block at print time", () => {
    const f = filledForm();
    const draft = `<h1>INITIAL MEDICAL EVALUATION REPORT</h1><p>Name: [PATIENT_NAME], DOB [PATIENT_DOB].</p><div class="draft-gaps"><h2>DRAFT REVIEW — MISSING ITEMS</h2><ul><li>pain scores</li></ul></div>`;
    const out = finalizeAiReport(draft, f);
    expect(out).toContain("Armando Falcon");
    expect(out).toContain("1966-05-07");
    expect(out).not.toContain("PATIENT_NAME");
    expect(out).not.toContain("draft-gaps");
    expect(out).not.toContain("pain scores");
  });

  it("the approved report becomes the printed note, inside the clinic skeleton", () => {
    const f = filledForm();
    f.ai!.reportDraft = `<h1>INITIAL MEDICAL EVALUATION REPORT — FLORIDA PIP</h1><p>[PATIENT_NAME] presents…</p>`;
    const html = buildClinicalNoteHtml(f);
    expect(html).toContain("INITIAL MEDICAL EVALUATION REPORT — FLORIDA PIP");
    expect(html).toContain("Armando Falcon presents");
    expect(html).toContain("Powered by RenuviaMD® Network"); // skeleton footer applied
    expect(html).not.toContain("History of Present Illness</h2>"); // composed format suppressed
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
