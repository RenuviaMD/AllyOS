import {
  buildAffidavitHtml,
  buildAobHtml,
  buildAttestation14Html,
  buildExcludedServicesHtml,
  buildPipRegulationHtml,
  buildRecordsReleaseHtml,
  buildTelehealthConsentHtml,
} from "./report";
import type { VisitForm } from "./types";

/**
 * Visit package registry — every intake/legal document generated beside the
 * clinical note. Each entry declares who produces it, who signs it, when it
 * applies, and whether it is one-time-per-patient. Adding a future document
 * = one entry here + one builder in report.ts; the panel and packet printing
 * pick it up automatically.
 */

export type PackageKind =
  | "aob"
  | "records_release"
  | "attestation14"
  | "pip_regulation"
  | "excluded_services"
  | "oir_disclosure"
  | "telehealth_consent"
  | "affidavit";

export interface PackageDocDef {
  kind: PackageKind;
  title: string;
  /** who generates it: front desk (staff) or the physician */
  producer: "staff" | "physician";
  signer: string;
  /** true → signed once at the patient's first visit, never regenerated */
  oncePerPatient: boolean;
  appliesTo: (form: VisitForm) => boolean;
  /** pre-filled HTML builder — absent for official state PDFs used as-is */
  build?: (form: VisitForm) => string;
  /** official state form shipped verbatim (never reproduced); opened/printed as the PDF itself */
  pdfUrl?: string;
}

export const PACKAGE_DOCS: PackageDocDef[] = [
  {
    kind: "aob",
    title: "Assignment of Benefits (AOB)",
    producer: "staff",
    signer: "Patient",
    oncePerPatient: true,
    appliesTo: (f) => f.visitType === "initial",
    build: buildAobHtml,
  },
  {
    kind: "records_release",
    title: "Medical Records Release (HIPAA)",
    producer: "staff",
    signer: "Patient",
    oncePerPatient: true,
    appliesTo: (f) => f.visitType === "initial",
    build: buildRecordsReleaseHtml,
  },
  {
    kind: "attestation14",
    title: "PIP 14-Day Attestation",
    producer: "staff",
    signer: "Patient",
    oncePerPatient: true,
    appliesTo: (f) => f.visitType === "initial",
    build: buildAttestation14Html,
  },
  {
    // The official Florida OIR form is used AS-IS (state PDF, byte-identical)
    // — pre-filling or re-typesetting it is prohibited. Patient signs at the
    // initial visit; provider countersigns; original filed on paper and mailed
    // with the claim (FL § 627.736 disclosure requirement).
    kind: "oir_disclosure",
    title: "Standard Disclosure & Acknowledgment (OIR-B1-1571) — official state form",
    producer: "staff",
    signer: "Patient + provider countersign",
    oncePerPatient: true,
    appliesTo: (f) => f.visitType === "initial",
    pdfUrl: "/forms/oir-b1-1571-standard-disclosure.pdf",
  },
  {
    kind: "pip_regulation",
    title: "Florida PIP Regulation & Requirements",
    producer: "staff",
    signer: "Patient + staff",
    oncePerPatient: true,
    appliesTo: (f) => f.visitType === "initial",
    build: buildPipRegulationHtml,
  },
  {
    kind: "excluded_services",
    title: "Excluded Services Acknowledgment",
    producer: "staff",
    signer: "Patient + staff",
    oncePerPatient: true,
    appliesTo: (f) => f.visitType === "initial",
    build: buildExcludedServicesHtml,
  },
  {
    kind: "telehealth_consent",
    title: "Telehealth Informed Consent",
    producer: "staff",
    signer: "Patient + staff witness",
    oncePerPatient: false, // signed for each telehealth visit
    appliesTo: (f) => f.visitMode === "telehealth",
    build: buildTelehealthConsentHtml,
  },
  {
    kind: "affidavit",
    title: "Sworn Affidavit of Attending Physician",
    producer: "physician",
    signer: "Physician + notary",
    oncePerPatient: true, // once per patient, at the first visit
    appliesTo: (f) => f.visitType === "initial",
    build: buildAffidavitHtml,
  },
];

export function applicableDocs(form: VisitForm): PackageDocDef[] {
  return PACKAGE_DOCS.filter((d) => d.appliesTo(form));
}

/**
 * Archival tracking record for an official state PDF form: records that the
 * form was printed for signature and filed on paper. Deliberately does NOT
 * reproduce any of the form's content — reprints open the PDF itself.
 */
export function pdfTrackingHtml(d: PackageDocDef, form: VisitForm): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const who = `${form.patient.firstName} ${form.patient.lastName}`.trim();
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.title)}</title></head><body>
    <p><strong>${esc(d.title)}</strong></p>
    <p>The official state form (PDF, used as-is) was printed for signature for ${esc(who)} (DOB ${esc(form.patient.dob)})
    on ${esc(form.visitDate)}. The signed original is filed on paper and mailed with the claim.
    To print another copy, reprint from the app — it opens the official PDF, never a reproduction.</p>
  </body></html>`;
}

/** Package docs need identity data before anything prints — pre-filled, never handwritten. */
export function packageReadiness(form: VisitForm): string[] {
  const missing: string[] = [];
  if (!form.patient.firstName.trim() || !form.patient.lastName.trim()) missing.push("patient name");
  if (!form.patient.dob) missing.push("date of birth");
  if (!form.accident.accidentDate) missing.push("accident date");
  return missing;
}

/** Combine several generated documents into one print job, one per page.
 * Each document carries its own fixed running footer; keep exactly one
 * (they are identical branding + same patient) so print doesn't stack them. */
export function combineDocsHtml(htmls: string[]): string {
  if (htmls.length === 0) return "";
  if (htmls.length === 1) return htmls[0];
  const FOOTER = /<div class="doc-footer">[\s\S]*?<\/div>/;
  const bodyOf = (h: string) => /<body>([\s\S]*)<\/body>/.exec(h)?.[1] ?? h;
  const head = /^([\s\S]*?<body>)/.exec(htmls[0])?.[1] ?? "<!doctype html><html><body>";
  const bodies = htmls.map(bodyOf);
  const footer = FOOTER.exec(bodies[0])?.[0] ?? "";
  const parts = bodies.map((b) => b.replace(FOOTER, "")).join('<div style="page-break-after: always"></div>');
  return `${head}${parts}${footer}</body></html>`;
}
