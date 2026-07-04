import { describe, expect, it } from "vitest";
import { applicableDocs, combineDocsHtml, PACKAGE_DOCS, packageReadiness, pdfTrackingHtml } from "../lib/packageDocs";
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

describe("package registry (6-form reception packet + official OIR disclosure)", () => {
  it("initial in-person visit: AOB, release, attestation, OIR disclosure, PIP regulation, excluded services, affidavit", () => {
    const kinds = applicableDocs(patient()).map((d) => d.kind);
    expect(kinds).toEqual([
      "aob",
      "records_release",
      "attestation14",
      "oir_disclosure",
      "pip_regulation",
      "excluded_services",
      "affidavit",
    ]);
  });

  it("telehealth visit adds the consent; follow-up drops the one-time intake docs", () => {
    const f = patient();
    f.visitType = "followup";
    f.visitMode = "telehealth";
    expect(applicableDocs(f).map((d) => d.kind)).toEqual(["telehealth_consent"]);
  });

  it("one-time-per-patient documents are exactly the first-visit set; affidavit is physician-produced", () => {
    const once = PACKAGE_DOCS.filter((d) => d.oncePerPatient).map((d) => d.kind);
    expect(once).toEqual(["aob", "records_release", "attestation14", "oir_disclosure", "pip_regulation", "excluded_services", "affidavit"]);
    expect(PACKAGE_DOCS.find((d) => d.kind === "affidavit")?.producer).toBe("physician");
    expect(PACKAGE_DOCS.filter((d) => d.producer === "staff").map((d) => d.kind)).toEqual([
      "aob",
      "records_release",
      "attestation14",
      "oir_disclosure",
      "pip_regulation",
      "excluded_services",
      "telehealth_consent",
    ]);
  });
});

describe("OIR-B1-1571 official state form (used as-is, never reproduced)", () => {
  const oir = PACKAGE_DOCS.find((d) => d.kind === "oir_disclosure")!;

  it("ships as the state PDF with NO HTML builder — the form is never re-typeset", () => {
    expect(oir.pdfUrl).toBe("/forms/oir-b1-1571-standard-disclosure.pdf");
    expect(oir.build).toBeUndefined();
    expect(oir.producer).toBe("staff");
    expect(oir.oncePerPatient).toBe(true);
  });

  it("its archival tracking record documents the paper filing without reproducing form content", () => {
    const html = pdfTrackingHtml(oir, patient());
    expect(html).toContain("Maria Lopez");
    expect(html).toContain("used as-is");
    expect(html).toContain("filed on paper");
    // none of the statutory form's own language is reproduced
    expect(html).not.toMatch(/services (were|have been) (rendered|actually)/i);
  });
});

describe("PIP regulation sheet (form 5)", () => {
  it("carries the benefit split, the computed 14-day deadline, and the denial warning", () => {
    const html = PACKAGE_DOCS.find((d) => d.kind === "pip_regulation")!.build!(patient());
    expect(html).toContain("$10,000");
    expect(html).toContain("$2,500");
    expect(html).toContain("Emergency Medical Condition");
    expect(html).toContain("627.732(4)"); // EMC definition — the adjudicated citation
    expect(html).toContain("627.736(1)(a)");
    expect(html).toContain("2026-07-04"); // accident 2026-06-20 + 14 days
    expect(html).toContain("DENIED entirely");
    expect(html).toContain("80%");
    expect(html).toContain("60%");
    expect(html).toContain("Massage therapy");
    expect(html).not.toContain("627.409"); // fraud statute never cited in EMC context
  });

  it("leaves the deadline blank when no accident date is entered (blank stays blank)", () => {
    const f = patient();
    f.accident.accidentDate = "";
    const html = PACKAGE_DOCS.find((d) => d.kind === "pip_regulation")!.build!(f);
    expect(html).toContain("14 days");
    expect(html).not.toContain("no later than");
  });
});

describe("excluded services acknowledgment (form 6)", () => {
  it("carries the exclusion, the four-step out-of-pocket path, and the hold-harmless clause", () => {
    const html = PACKAGE_DOCS.find((d) => d.kind === "excluded_services")!.build!(patient());
    expect(html).toContain("massage therapy");
    expect(html).toContain("acupuncture");
    expect(html).toContain("627.736(1)(a)5");
    expect(html).toContain("explicitly request");
    expect(html).toContain("acknowledge in writing");
    expect(html).toContain("agree to pay in full");
    expect(html).toContain("itemized superbill");
    expect(html).toContain("hold");
    expect(html).toContain("harmless");
  });
});

describe("pre-filled documents (no handwriting)", () => {
  it("every pre-filled document carries the patient name, DOB, and accident date (official PDFs excluded — used as-is)", () => {
    const f = patient();
    for (const d of applicableDocs(f)) {
      if (!d.build) continue; // official state PDF — nothing generated
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
    const docs = applicableDocs(f).filter((d) => d.build).map((d) => d.build!(f));
    const combined = combineDocsHtml(docs);
    expect(combined.match(/page-break-after: always/g)?.length).toBe(docs.length - 1);
    expect(combined).toContain("ASSIGNMENT OF BENEFITS");
    expect(combined).toContain("SWORN AFFIDAVIT");
    // still a single valid document
    expect(combined.match(/<\/html>/g)?.length).toBe(1);
    // exactly ONE running footer element survives the merge (stacked fixed footers would overprint)
    expect(combined.match(/class="doc-footer"/g)?.length).toBe(1);
  });

  it("every document carries the PI Master running footer with claim context", () => {
    const f = patient();
    f.patient.claimNumber = "CL-123";
    for (const d of applicableDocs(f)) {
      if (!d.build) continue; // official state PDF prints without our footer
      const html = d.build(f);
      expect(html).toContain("Powered by RenuviaMD® Network");
      expect(html).toContain("PIP Documentation");
      expect(html).toContain("Claim #: CL-123");
    }
  });
});
