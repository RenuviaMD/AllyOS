import { describe, expect, it } from "vitest";
import { applicableDocs, combineDocsHtml, PACKAGE_DOCS, packageReadiness } from "../lib/packageDocs";
import { emptyForm } from "../lib/types";

function patient() {
  const f = emptyForm();
  f.patient.firstName = "Maria";
  f.patient.lastName = "Lopez";
  f.patient.dob = "1985-03-10";
  f.patient.insuranceCarrier = "ABC Insurance";
  f.accident.accidentDate = "2026-06-20";
  f.visitDate = "2026-06-25";
  return f;
}

describe("package registry", () => {
  it("initial in-person visit: AOB, release, attestation, affidavit — no telehealth consent", () => {
    const kinds = applicableDocs(patient()).map((d) => d.kind);
    expect(kinds).toEqual(["aob", "records_release", "attestation14", "affidavit"]);
  });

  it("telehealth visit adds the consent; follow-up drops the one-time intake docs", () => {
    const f = patient();
    f.visitType = "followup";
    f.visitMode = "telehealth";
    expect(applicableDocs(f).map((d) => d.kind)).toEqual(["telehealth_consent"]);
  });

  it("one-time-per-patient documents are exactly the first-visit set; affidavit is physician-produced", () => {
    const once = PACKAGE_DOCS.filter((d) => d.oncePerPatient).map((d) => d.kind);
    expect(once).toEqual(["aob", "records_release", "attestation14", "affidavit"]);
    expect(PACKAGE_DOCS.find((d) => d.kind === "affidavit")?.producer).toBe("physician");
    expect(PACKAGE_DOCS.filter((d) => d.producer === "staff").map((d) => d.kind)).toEqual([
      "aob",
      "records_release",
      "attestation14",
      "telehealth_consent",
    ]);
  });
});

describe("pre-filled documents (no handwriting)", () => {
  it("every applicable document carries the patient name, DOB, and accident date", () => {
    const f = patient();
    for (const d of applicableDocs(f)) {
      const html = d.build(f);
      expect(html).toContain("Maria");
      expect(html).toContain("Lopez");
      expect(html).toContain("1985-03-10");
      expect(html).toContain("2026-06-20");
    }
  });

  it("readiness blocks generation until name, DOB, and accident date exist", () => {
    expect(packageReadiness(emptyForm()).length).toBe(3);
    expect(packageReadiness(patient())).toEqual([]);
  });
});

describe("combineDocsHtml", () => {
  it("merges documents into one print job with page breaks", () => {
    const f = patient();
    const docs = applicableDocs(f).map((d) => d.build(f));
    const combined = combineDocsHtml(docs);
    expect(combined.match(/page-break-after: always/g)?.length).toBe(docs.length - 1);
    expect(combined).toContain("ASSIGNMENT OF BENEFITS");
    expect(combined).toContain("SWORN AFFIDAVIT");
    // still a single valid document
    expect(combined.match(/<\/html>/g)?.length).toBe(1);
    // exactly ONE running footer survives the merge (stacked fixed footers would overprint)
    expect(combined.match(/doc-footer/g)?.length).toBe(1);
  });

  it("every document carries the PI Master running footer with claim context", () => {
    const f = patient();
    f.patient.claimNumber = "CL-123";
    for (const d of applicableDocs(f)) {
      const html = d.build(f);
      expect(html).toContain("Powered by RenuviaMD® Network");
      expect(html).toContain("PIP Documentation");
      expect(html).toContain("Claim #: CL-123");
    }
  });
});
