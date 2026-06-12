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
  f.plan.emc = "yes";
  f.plan.causation = "related";
  f.plan.prognosis = "Good";
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

  it("blocks an initial visit without an EMC determination", () => {
    const f = completedForm();
    f.plan.emc = "";
    expect(auditNote(f).errors.some((e) => e.includes("Emergency Medical Condition"))).toBe(true);
  });

  it("blocks an initial visit without a causation opinion", () => {
    const f = completedForm();
    f.plan.causation = "";
    expect(auditNote(f).errors.some((e) => e.includes("Causation"))).toBe(true);
  });
});

describe("auditNote — telehealth", () => {
  function telehealthForm(): VisitForm {
    const f = completedForm();
    f.visitMode = "telehealth";
    f.telehealth.consentObtained = true;
    f.telehealth.overrideReason = "Provider out of state; staff-assisted facility visit.";
    return f;
  }

  it("requires documented consent", () => {
    const f = telehealthForm();
    f.telehealth.consentObtained = false;
    expect(auditNote(f).errors.some((e) => e.includes("consent"))).toBe(true);
    f.telehealth.consentObtained = true;
    expect(auditNote(f).errors).toEqual([]);
  });

  it("requires an override reason on initial/final telehealth visits", () => {
    const f = telehealthForm();
    f.telehealth.overrideReason = "";
    expect(auditNote(f).errors.some((e) => e.includes("default to in-person"))).toBe(true);
    f.visitType = "followup";
    expect(auditNote(f).errors).toEqual([]);
  });

  it("blocks hands-on findings on a telehealth visit", () => {
    const f = telehealthForm();
    f.spineExam.cervical.tenderness = "yes";
    expect(auditNote(f).errors.some((e) => e.includes("Hands-on"))).toBe(true);
  });

  it("blocks joint tenderness on a telehealth visit", () => {
    const f = telehealthForm();
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
