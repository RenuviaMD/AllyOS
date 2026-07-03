import { describe, expect, it } from "vitest";
import {
  AUDIT_POINTS,
  autoEvaluate,
  buildEncountersCsv,
  chartScore,
  failedPoints,
  statusFor,
  type EncounterExport,
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

describe("AHCA Pro encounter export", () => {
  it("lists deficiency points as risk flags", () => {
    const f = completedForm();
    f.plan.emc = "";
    const flags = failedPoints(autoEvaluate(f, ["99204"], ["S13.4XXA"]));
    expect(flags).toContain("emc");
  });

  it("builds a CSV with a header and one line per encounter, escaping commas", () => {
    const rows: EncounterExport[] = [
      {
        chartId: "a1b2c3d4",
        dos: "2026-06-01",
        initials: "T.P.",
        visitType: "initial",
        modality: "In-Person",
        telehealth: false,
        icd: ["S13.4XXA", "M54.2"],
        cpt: ["99204"],
        chargeTotal: "300.00",
        deficiencies: 2,
        riskStatus: "CORRECTIVE",
        riskFlags: ["billing_match", "emc"],
      },
    ];
    const csv = buildEncountersCsv(rows);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Chart ID");
    expect(lines[0]).toContain("Risk Flags");
    expect(lines[1]).toContain("a1b2c3d4");
    expect(lines[1]).toContain("$300.00");
    expect(lines[1]).toContain("CORRECTIVE");
    // multi-code cells are space-joined, so no stray commas split the row
    expect(lines[1].split(",").length).toBe(12);
    expect(AUDIT_POINTS.length).toBe(10);
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
});
