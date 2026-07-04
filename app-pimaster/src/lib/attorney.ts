import type { BillingSettings } from "./billing";
import { CLINIC } from "./clinic";
import type { VisitForm } from "./types";

/**
 * Attorney delivery package: compiles a patient's complete case record —
 * cover letter, table of contents, face sheet, every note (MD + PT), EMC
 * certification when present, billing ledger, and a records-custodian
 * certification — into one printable document for the patient's attorney.
 * This is an intentional PHI release to an authorized recipient: generation
 * is gated on documented patient authorization and logged as a disclosure.
 */

export interface PackageDoc {
  id: string;
  mode: string;
  dos: string;
  html: string;
  cpt: string[];
}

export interface PatientGroup {
  key: string;
  name: string;
  dob: string;
  accidentDate: string;
  reportIds: string[];
  modes: string[];
  firstDos: string;
  lastDos: string;
}

export const MODE_LABELS: Record<string, string> = {
  initial: "Initial Evaluation",
  followup: "Follow-Up Evaluation",
  final: "Final Evaluation / Discharge",
  ptdaily: "Physical Therapy Daily Note",
  ptprogress: "Physical Therapy Weekly Summary",
  affidavit: "Sworn Affidavit of Attending Physician",
  oir_disclosure: "Standard Disclosure & Acknowledgment (OIR-B1-1571)",
  aob: "Assignment of Benefits",
  records_release: "Medical Records Release (HIPAA)",
  attestation14: "PIP 14-Day Attestation",
  pip_regulation: "Florida PIP Regulation & Requirements",
  excluded_services: "Excluded Services Acknowledgment",
  telehealth_consent: "Telehealth Informed Consent",
};

/** Order documents the way an attorney reads a demand package — clinical
 * record first, then the sworn affidavit and signed intake forms as exhibits. */
const MODE_ORDER: Record<string, number> = {
  initial: 0,
  followup: 1,
  final: 2,
  ptdaily: 3,
  ptprogress: 4,
  affidavit: 5,
  oir_disclosure: 6,
  aob: 7,
  records_release: 8,
  attestation14: 9,
  pip_regulation: 10,
  excluded_services: 11,
  telehealth_consent: 12,
};

export function sortDocs<T extends { mode: string; dos: string }>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    const m = (MODE_ORDER[a.mode] ?? 9) - (MODE_ORDER[b.mode] ?? 9);
    return m !== 0 ? m : a.dos.localeCompare(b.dos);
  });
}

/** Group saved reports into patient cases by name + DOB + accident date. */
export function groupPatients(
  rows: { id: string; mode: string; dos: string; form: Partial<VisitForm> | null }[],
): PatientGroup[] {
  const groups = new Map<string, PatientGroup>();
  for (const r of rows) {
    const p = r.form?.patient;
    const name = `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim();
    if (!name) continue;
    const dob = p?.dob ?? "";
    const accident = r.form?.accident?.accidentDate ?? "";
    const key = `${name.toLowerCase()}|${dob}|${accident}`;
    const g = groups.get(key) ?? {
      key,
      name,
      dob,
      accidentDate: accident,
      reportIds: [],
      modes: [],
      firstDos: r.dos,
      lastDos: r.dos,
    };
    g.reportIds.push(r.id);
    g.modes.push(r.mode);
    if (r.dos < g.firstDos) g.firstDos = r.dos;
    if (r.dos > g.lastDos) g.lastDos = r.dos;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.lastDos.localeCompare(a.lastDos));
}

/** Pull the printable content out of a stored full-page report document. */
export function extractBody(html: string): string {
  const styles = (html.match(/<style[\s\S]*?<\/style>/gi) ?? []).join("\n");
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  // Strip each document's fixed running footer — stacked fixed elements from
  // many embedded documents would overprint each other in the package.
  const content = (body ? body[1] : html).replace(/<div class="doc-footer">[\s\S]*?<\/div>/g, "");
  return `${styles}\n${content}`;
}

function esc(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface AttorneyInfo {
  name: string;
  firm: string;
  address: string;
}

export interface LedgerRow {
  dos: string;
  document: string;
  cpt: string;
  charge: string;
}

/** Billing ledger rows from each document's saved CPT codes + the clinic fee schedule. */
export function buildLedger(docs: PackageDoc[], settings: BillingSettings): { rows: LedgerRow[]; total: string } {
  const rows: LedgerRow[] = [];
  let total = 0;
  let any = false;
  for (const d of docs) {
    for (const cpt of d.cpt) {
      const charge = settings.fees[cpt] ?? "";
      const v = parseFloat(charge);
      if (!Number.isNaN(v)) {
        total += v;
        any = true;
      }
      rows.push({ dos: d.dos, document: MODE_LABELS[d.mode] ?? d.mode, cpt, charge });
    }
  }
  return { rows, total: any ? total.toFixed(2) : "" };
}

export function buildAttorneyPackageHtml(args: {
  patient: { name: string; dob: string; accidentDate: string };
  attorney: AttorneyInfo;
  docs: PackageDoc[];
  settings: BillingSettings;
  generatedBy: string;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const docs = sortDocs(args.docs);
  const ledger = buildLedger(docs, args.settings);

  const toc = docs
    .map((d, i) => `<tr><td>TAB ${i + 1}</td><td>${esc(MODE_LABELS[d.mode] ?? d.mode)}</td><td>${esc(d.dos)}</td></tr>`)
    .join("");

  const sections = docs
    .map(
      (d, i) => `<section class="pkg-doc">
        <div class="tab-head">TAB ${i + 1} — ${esc(MODE_LABELS[d.mode] ?? d.mode)} — DOS ${esc(d.dos)} — Ref ${esc(d.id.slice(0, 8))}</div>
        ${extractBody(d.html)}
      </section>`,
    )
    .join("\n");

  const ledgerRows = ledger.rows
    .map((r) => `<tr><td>${esc(r.dos)}</td><td>${esc(r.document)}</td><td>${esc(r.cpt)}</td><td>${r.charge ? `$${esc(r.charge)}` : ""}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Records Package — ${esc(args.patient.name)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a252f; margin: 40px; font-size: 13px; }
    .letterhead { text-align: center; border-bottom: 3px double #16a085; padding-bottom: 10px; margin-bottom: 18px; }
    .lh-name { font-size: 19px; font-weight: bold; color: #2c3e50; letter-spacing: 1px; }
    h1 { font-size: 16px; color: #2c3e50; border-bottom: 2px solid #f39c12; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
    td, th { border: 1px solid #b0bec5; padding: 5px 8px; text-align: left; }
    th { background: #eef5f4; }
    .sig { margin-top: 44px; } .sig-line { border-top: 1px solid #1a252f; width: 320px; padding-top: 4px; }
    .pkg-doc { page-break-before: always; border-top: 4px solid #16a085; margin-top: 30px; padding-top: 10px; }
    .tab-head { background: #2c3e50; color: #f39c12; font-weight: bold; padding: 6px 10px; font-size: 12px; letter-spacing: 1px; }
    .pkg-doc .letterhead { margin-top: 10px; }
    @media print { body { margin: 16px; } }
  </style></head><body>

  <div class="letterhead"><div class="lh-name">${esc(CLINIC.name)}</div>
  <div>${esc(CLINIC.address)}</div><div>Phone: ${esc(CLINIC.phone)} | Fax: ${esc(CLINIC.fax)}</div></div>

  <p>${esc(today)}</p>
  <p>${esc(args.attorney.name)}${args.attorney.firm ? `<br>${esc(args.attorney.firm)}` : ""}${args.attorney.address ? `<br>${esc(args.attorney.address)}` : ""}</p>
  <p><strong>RE:</strong> ${esc(args.patient.name)} — DOB ${esc(args.patient.dob)} — Date of Accident ${esc(args.patient.accidentDate)}</p>
  <p>Dear ${esc(args.attorney.name)}:</p>
  <p>Enclosed please find the complete certified medical records and itemized billing for the above-referenced patient
  for treatment rendered at ${esc(CLINIC.name)} from ${esc(docs[0]?.dos ?? "")} through ${esc(docs[docs.length - 1]?.dos ?? "")},
  pursuant to the patient's authorization on file. The package contains ${docs.length} clinical document(s), the itemized
  billing ledger, and the records custodian certification. Please contact our office with any questions.</p>
  <p>Sincerely,<br><br>${esc(CLINIC.provider)}<br>${esc(CLINIC.name)}</p>

  <h1>TABLE OF CONTENTS</h1>
  <table><tr><th>Tab</th><th>Document</th><th>Date of Service</th></tr>${toc}
  <tr><td>TAB ${docs.length + 1}</td><td>Itemized Billing Ledger</td><td>—</td></tr>
  <tr><td>TAB ${docs.length + 2}</td><td>Certification of Records Custodian</td><td>—</td></tr></table>

  <h1>PATIENT FACE SHEET</h1>
  <table>
    <tr><th>Patient</th><td>${esc(args.patient.name)}</td><th>DOB</th><td>${esc(args.patient.dob)}</td></tr>
    <tr><th>Date of Accident</th><td>${esc(args.patient.accidentDate)}</td><th>Treatment Period</th><td>${esc(docs[0]?.dos ?? "")} — ${esc(docs[docs.length - 1]?.dos ?? "")}</td></tr>
    <tr><th>Facility</th><td colspan="3">${esc(CLINIC.name)}, ${esc(CLINIC.address)}</td></tr>
    <tr><th>Provider</th><td colspan="3">${esc(CLINIC.provider)} — License ${esc(CLINIC.license)} — NPI ${esc(CLINIC.npi)}</td></tr>
  </table>

  ${sections}

  <section class="pkg-doc">
    <div class="tab-head">TAB ${docs.length + 1} — ITEMIZED BILLING LEDGER</div>
    <h1>ITEMIZED BILLING LEDGER</h1>
    <table><tr><th>DOS</th><th>Document</th><th>CPT</th><th>Charge</th></tr>${ledgerRows}
    <tr><td colspan="3" style="text-align:right"><strong>Total charges</strong></td><td><strong>${ledger.total ? `$${ledger.total}` : "—"}</strong></td></tr></table>
    ${ledger.total ? "" : '<p style="font-size:11px;color:#555">Charges pending fee-schedule entry; CPT codes listed as documented.</p>'}
  </section>

  <section class="pkg-doc">
    <div class="tab-head">TAB ${docs.length + 2} — CERTIFICATION OF RECORDS CUSTODIAN</div>
    <h1>CERTIFICATION OF RECORDS CUSTODIAN</h1>
    <p>I hereby certify that I am the custodian of records (or a person authorized by the custodian) of ${esc(CLINIC.name)},
    and that the attached ${docs.length} document(s) and itemized billing are true and correct copies of the medical
    records of ${esc(args.patient.name)} (DOB ${esc(args.patient.dob)}), made and kept at or near the time of the acts,
    events, and treatments described, by or from information transmitted by persons with knowledge, and maintained in
    the ordinary course of the regularly conducted business of this facility.</p>
    <p>This release is made pursuant to the patient's written authorization on file. Generated ${esc(today)} by ${esc(args.generatedBy)}.</p>
    <div class="sig"><div class="sig-line">Custodian of Records / ${esc(CLINIC.provider)}<br>${esc(CLINIC.name)}<br>Date: ${esc(today)}</div></div>
  </section>

  </body></html>`;
}
