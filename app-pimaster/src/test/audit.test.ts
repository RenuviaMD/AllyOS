import { describe, expect, it } from "vitest";
import { auditNote } from "../lib/audit";
import { emptyForm, type VisitForm } from "../lib/types";

function completedForm(): VisitForm {
  const f = emptyForm();
  f.patient.firstName = "Test";
  f.patient.lastName = "Patient";
  f.patient.dob = "1980-01-01";
  f.accident.accidentDate = "2026-06-01";
  f.plan.medicalNecessity = "Initiation of care is medically necessary based on documented findings.";
  f.plan.emLevel = "99204";
  f.imaging.selected = ["spine-cervical"];
  return f;
}

describe("auditNote — in person", () => {
  it("passes a complete in-person note", () => {
    expect(auditNote(completedForm()).errors).toEqual([]);
  });

  it("blocks a note with no medical necessity", () => {
    const f = completedForm();
    f.plan.medicalNecessity = "";
    expect(auditNote(f).errors.some((e) => e.includes("Medical necessity"))).toBe(true);
  });
});

describe("auditNote — telehealth", () => {
  it("requires documented consent", () => {
    const f = completedForm();
    f.visitMode = "telehealth";
    expect(auditNote(f).errors.some((e) => e.includes("consent"))).toBe(true);
    f.telehealth.consentObtained = true;
    expect(auditNote(f).errors).toEqual([]);
  });

  it("blocks hands-on findings on a telehealth visit", () => {
    const f = completedForm();
    f.visitMode = "telehealth";
    f.telehealth.consentObtained = true;
    f.spineExam.cervical.tenderness = "yes";
    expect(auditNote(f).errors.some((e) => e.includes("Hands-on"))).toBe(true);
  });

  it("blocks joint tenderness on a telehealth visit", () => {
    const f = completedForm();
    f.visitMode = "telehealth";
    f.telehealth.consentObtained = true;
    f.jointTenderness = { shoulder: { R: "yes", L: "" } };
    expect(auditNote(f).errors.some((e) => e.includes("Hands-on"))).toBe(true);
  });
});

describe("auditNote — final visit", () => {
  it("requires a discharge outcome", () => {
    const f = completedForm();
    f.visitType = "final";
    expect(auditNote(f).errors.some((e) => e.includes("outcome"))).toBe(true);
    f.discharge.outcome = "Significant";
    expect(auditNote(f).errors).toEqual([]);
  });
});
