import {
  buildAffidavitHtml,
  buildAobHtml,
  buildAttestation14Html,
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

export type PackageKind = "aob" | "records_release" | "attestation14" | "telehealth_consent" | "affidavit";

export interface PackageDocDef {
  kind: PackageKind;
  title: string;
  /** who generates it: front desk (staff) or the physician */
  producer: "staff" | "physician";
  signer: string;
  /** true → signed once at the patient's first visit, never regenerated */
  oncePerPatient: boolean;
  appliesTo: (form: VisitForm) => boolean;
  build: (form: VisitForm) => string;
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

/** Package docs need identity data before anything prints — pre-filled, never handwritten. */
export function packageReadiness(form: VisitForm): string[] {
  const missing: string[] = [];
  if (!form.patient.firstName.trim() || !form.patient.lastName.trim()) missing.push("patient name");
  if (!form.patient.dob) missing.push("date of birth");
  if (!form.accident.accidentDate) missing.push("accident date");
  return missing;
}

/** Combine several generated documents into one print job, one per page. */
export function combineDocsHtml(htmls: string[]): string {
  if (htmls.length === 0) return "";
  if (htmls.length === 1) return htmls[0];
  const bodyOf = (h: string) => /<body>([\s\S]*)<\/body>/.exec(h)?.[1] ?? h;
  const head = /^([\s\S]*?<body>)/.exec(htmls[0])?.[1] ?? "<!doctype html><html><body>";
  const parts = htmls.map(bodyOf).join('<div style="page-break-after: always"></div>');
  return `${head}${parts}</body></html>`;
}
