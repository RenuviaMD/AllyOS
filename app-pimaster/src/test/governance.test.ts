import { describe, expect, it } from "vitest";
import {
  AUDIT_POINTS,
  autoEvaluate,
  buildGovernanceReportHtml,
  chartScore,
  MAX_CHARTS,
  MIN_CHARTS,
  sampleCharts,
  statusFor,
  worstStatus,
  type ChartReviewItem,
} from "../lib/governance";
import { withEncounter } from "../lib/icd10";
import { emptyForm, type VisitForm } from "../lib/types";

function completedForm(): VisitForm {
  const f = emptyForm();
  f.patient.firstName = "Test";
  f.patient.lastName = "Patient";
  f.patient.dob = "1980-01-01";
  f.patient.insuranceCarrier = "Real Insurance Co";
  f.accident.accidentDate = "2026-06-01";
  f.plan.medicalNecessity = "Initiation medically necessary.";
  f.plan.emLevel = "99204";
  f.plan.emc = "yes";
  return f;
}

describe("7th-character encounter switching", () => {
  it("keeps A on initial visits and switches to D on follow-up/final", () => {
    const dx = { code: "S13.4XXA", desc: "Sprain of ligaments of cervical spine, initial encounter" };
    expect(withEncounter(dx, "initial")).toEqual(dx);
    expect(withEncounter(dx, "followup")).toEqual({
      code: "S13.4XXD",
      desc: "Sprain of ligaments of cervical spine, subsequent encounter",
    });
    expect(withEncounter(dx, "final").code).toBe("S13.4XXD");
  });

  it("never touches non-injury (M/G chapter) codes", () => {
    const dx = { code: "M54.2", desc: "Cervicalgia" };
    expect(withEncounter(dx, "followup")).toEqual(dx);
  });
});

describe("autoEvaluate inspection points", () => {
  it("passes a clean initial chart and scores 100% on auto points", () => {
    const ev = autoEvaluate(completedForm(), ["99204"], ["S13.4XXA", "M54.2"]);
    expect(ev.intake.value).toBe("Y");
    expect(ev.billing_match.value).toBe("Y");
    expect(ev.necessity.value).toBe("Y");
    expect(ev.emc.value).toBe("Y");
    expect(ev.encounter_char.value).toBe("Y");
    expect(ev.consent.value).toBe("NA"); // in-person
    expect(ev.authority.value).toBe("NA"); // manual MD point
  });

  it("flags billed CPTs with no documented service (billing-note match)", () => {
    const ev = autoEvaluate(completedForm(), ["99204", "97140"], ["S13.4XXA"]);
    expect(ev.billing_match.value).toBe("N");
    expect(ev.billing_match.reason).toContain("97140");
  });

  it("ignores imaging CPTs in the billing match (billed by the imaging center)", () => {
    const ev = autoEvaluate(completedForm(), ["99204", "72040"], ["S13.4XXA"]);
    expect(ev.billing_match.value).toBe("Y");
  });

  it("flags wrong 7th character for the visit type", () => {
    const f = completedForm();
    f.visitType = "followup";
    const ev = autoEvaluate(f, ["99214"], ["S13.4XXA"]);
    expect(ev.encounter_char.value).toBe("N");
    expect(ev.encounter_char.reason).toContain("S13.4XXA");
  });

  it("requires telehealth consent on telehealth charts", () => {
    const f = completedForm();
    f.visitMode = "telehealth";
    const ev = autoEvaluate(f, ["99204"], ["S13.4XXA"]);
    expect(ev.consent.value).toBe("N");
    expect(ev.telehealth.value).toBe("N");
  });

  it("flags a missing EMC determination on initial visits", () => {
    const f = completedForm();
    f.plan.emc = "";
    expect(autoEvaluate(f, ["99204"], ["S13.4XXA"]).emc.value).toBe("N");
  });
});

describe("scoring and status ladder", () => {
  it("computes per-chart score from Y/N (NA excluded)", () => {
    const ev = autoEvaluate(completedForm(), ["99204"], ["S13.4XXA"]);
    const s = chartScore(ev);
    expect(s.no).toBe(0);
    expect(s.pct).toBe(100);
  });

  it("maps percentages to PASS/MONITOR/CORRECTIVE/ESCALATION", () => {
    expect(statusFor(100)).toBe("PASS");
    expect(statusFor(85)).toBe("MONITOR");
    expect(statusFor(70)).toBe("CORRECTIVE");
    expect(statusFor(40)).toBe("ESCALATION");
  });

  it("overall status is the worst chart status", () => {
    expect(worstStatus(["PASS", "MONITOR", "CORRECTIVE"])).toBe("CORRECTIVE");
    expect(worstStatus(["PASS", "PASS"])).toBe("PASS");
  });
});

describe("binder report", () => {
  it("enforces the 5–10 range constants and sampling bounds", () => {
    expect(MIN_CHARTS).toBe(5);
    expect(MAX_CHARTS).toBe(10);
    expect(sampleCharts([1, 2, 3], 10)).toHaveLength(3);
  });

  it("includes statute, KPIs, matrix, and MD override markers", () => {
    const item: ChartReviewItem = {
      reportId: "r1c4f2a9b",
      patientInitials: "T.P.",
      dos: "2026-05-04",
      mode: "initial",
      telehealth: false,
      evaluation: autoEvaluate(completedForm(), ["99204"], ["S13.4XXA"]),
      mdOverrides: ["authority"],
      comments: "License verified on DOH.",
    };
    const html = buildGovernanceReportHtml({
      month: "2026-05",
      targetCount: 5,
      totalChartsInMonth: 3,
      items: [item],
      reviewer: "Dr. Armando Falcon, MD",
      followUp: "Re-train staff on consent capture.",
    });
    expect(html).toContain("400.9935");
    expect(html).toContain("MEDICAL DIRECTOR CHART AUDIT REPORT");
    expect(html).toContain("Total encounters");
    expect(html).toContain("T.P.");
    expect(html).not.toContain("Test Patient"); // no PHI in the admin report
    expect(html).toContain("protected health information");
    expect(html).toContain("all available charts were reviewed");
    expect(html).toContain("Re-train staff on consent capture.");
    expect(AUDIT_POINTS.length).toBe(10);
  });
});
