import { describe, expect, it } from "vitest";
import type { BillingSettings } from "../lib/billing";
import { auditPackage, buildVisitBatches, packageManifest, type PackageVisitRef } from "../lib/billingPackage";
import { emptyForm, type VisitForm } from "../lib/types";

const CLAIMS_ADDR = "PO BOX 31100, TAMPA, FL 33631";

function settings(partial: Partial<BillingSettings> = {}): BillingSettings {
  return {
    ein: "81-1815031",
    billingNpi: "1234567890",
    renderingNpi: "1447295126",
    fees: { "99204": "250", "99214": "165", "97110": "45", "97014": "30" },
    ...partial,
  };
}

function completeForm(mutate?: (f: VisitForm) => void): VisitForm {
  const f = emptyForm();
  f.patient.firstName = "Maria";
  f.patient.lastName = "Gomez";
  f.patient.dob = "1988-04-12";
  f.patient.address = "1 Main St";
  f.patient.city = "Doral";
  f.patient.zip = "33166";
  f.patient.insuranceCarrier = "Progressive";
  f.patient.policyNumber = "P-100";
  f.patient.claimNumber = "CLM-1";
  f.accident.accidentDate = "2026-06-20";
  f.plan.emc = "yes";
  f.plan.emLevel = "99204";
  f.assessment.autoCodes = [{ code: "S13.4XXA", desc: "Cervical sprain" }];
  mutate?.(f);
  return f;
}

function visit(mode: string, dos: string, mutate?: (f: VisitForm) => void): PackageVisitRef {
  const f = completeForm((x) => {
    x.visitDate = dos;
    if (mode === "ptdaily") x.ptDaily.treatments = ["97110", "97014"];
    mutate?.(x);
  });
  f.visitType = mode === "final" ? "final" : mode === "followup" ? "followup" : "initial";
  return { id: `${mode}-${dos}`, mode, dos, form: f };
}

describe("buildVisitBatches (8-visit claim batches)", () => {
  it("chunks a case's visits into batches of 8 in DOS order", () => {
    const visits = Array.from({ length: 11 }, (_, i) => visit(i === 0 ? "initial" : "ptdaily", `2026-07-${String(i + 1).padStart(2, "0")}`));
    const batches = buildVisitBatches(visits);
    expect(batches).toHaveLength(2);
    expect(batches[0].visits).toHaveLength(8);
    expect(batches[1].visits).toHaveLength(3);
    expect(batches[0].firstDos).toBe("2026-07-01");
    expect(batches[1].index).toBe(2);
  });

  it("ignores non-visit documents (intake forms) but keeps PT weekly summaries", () => {
    const rows = [visit("initial", "2026-07-01"), visit("aob", "2026-07-01"), visit("ptprogress", "2026-07-05")];
    const b = buildVisitBatches(rows);
    expect(b[0].visits.map((v) => v.mode)).toEqual(["initial", "ptprogress"]);
  });
});

describe("auditPackage — hard stops", () => {
  it("passes clean on a complete batch", () => {
    const a = auditPackage([visit("initial", "2026-06-21"), visit("ptdaily", "2026-06-24")], settings(), CLAIMS_ADDR);
    expect(a.stops).toEqual([]);
    expect(a.totalBilled).toBe("325.00"); // 250 + 45 + 30
  });

  it("blocks when the carrier claims MAILING address is missing (mail-only submission)", () => {
    const a = auditPackage([visit("initial", "2026-06-21")], settings(), "");
    expect(a.stops.join()).toMatch(/MAILING address/);
  });

  it("blocks on missing billing identity (EIN, group NPI, rendering NPI)", () => {
    const a = auditPackage([visit("initial", "2026-06-21")], settings({ ein: "", billingNpi: "", renderingNpi: "" }), CLAIMS_ADDR);
    expect(a.stops.join()).toMatch(/EIN/);
    expect(a.stops.join()).toMatch(/33a/);
    expect(a.stops.join()).toMatch(/24J/);
  });

  it("blocks on incomplete patient identity/address and missing accident date", () => {
    const a = auditPackage(
      [visit("initial", "2026-06-21", (f) => { f.patient.address = ""; f.patient.dob = ""; f.accident.accidentDate = ""; })],
      settings(),
      CLAIMS_ADDR,
    );
    expect(a.stops.join()).toMatch(/address is incomplete/);
    expect(a.stops.join()).toMatch(/date of birth/);
    expect(a.stops.join()).toMatch(/Accident date/);
  });

  it("blocks an MD visit without an E/M level and a PT session without treatments", () => {
    const noEm = auditPackage([visit("followup", "2026-07-01", (f) => (f.plan.emLevel = ""))], settings(), CLAIMS_ADDR);
    expect(noEm.stops.join()).toMatch(/no E\/M level/);
    const noTx = auditPackage(
      [visit("initial", "2026-06-21"), visit("ptdaily", "2026-06-24", (f) => (f.ptDaily.treatments = []))],
      settings(),
      CLAIMS_ADDR,
    );
    expect(noTx.stops.join()).toMatch(/no treatments documented/);
  });

  it("blocks when the MD documentation carries no diagnosis codes", () => {
    const a = auditPackage(
      [visit("initial", "2026-06-21", (f) => { f.assessment.autoCodes = []; f.romExam = {}; })],
      settings(),
      CLAIMS_ADDR,
    );
    expect(a.stops.join()).toMatch(/diagnosis codes/);
  });
});

describe("auditPackage — warnings (never block)", () => {
  it("warns on unpriced CPTs, blank policy/claim numbers, and EMC not certified", () => {
    const a = auditPackage(
      [visit("initial", "2026-06-21", (f) => { f.plan.emc = "deferred"; f.patient.policyNumber = ""; f.patient.claimNumber = ""; })],
      settings({ fees: {} }),
      CLAIMS_ADDR,
    );
    expect(a.stops).toEqual([]);
    expect(a.warnings.join()).toMatch(/No charge configured for CPT 99204/);
    expect(a.warnings.join()).toMatch(/Policy number is blank/);
    expect(a.warnings.join()).toMatch(/claim number is blank/);
    expect(a.warnings.join()).toMatch(/\$2,500/);
    expect(a.totalBilled).toBe("");
  });

  it("warns when the batch runs more than a year past the accident", () => {
    const a = auditPackage([visit("initial", "2026-06-21"), visit("followup", "2027-08-01")], settings(), CLAIMS_ADDR);
    expect(a.warnings.join()).toMatch(/1 year post-accident/);
  });
});

describe("packageManifest", () => {
  it("lists the mailed bundle contents with per-visit claim forms", () => {
    const m = packageManifest([visit("initial", "2026-06-21"), visit("ptdaily", "2026-06-24"), visit("ptprogress", "2026-06-27")]);
    expect(m).toEqual([
      "Cover Sheet (this page)",
      "Physician visit notes × 1",
      "PT daily session notes × 1",
      "PT weekly summaries × 1",
      "Superbills × 2",
      "CMS-1500 claim forms × 2",
    ]);
  });
});
