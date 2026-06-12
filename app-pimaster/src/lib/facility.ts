import { CLINIC } from "./clinic";

/**
 * Facility-level AHCA compliance registries (PHI-free admin layer), modeled on
 * the AHCA Pro platform: practitioners, vendors, equipment, incidents,
 * referral contracts. Config-driven so all five share one generic UI.
 */

export type FieldType = "text" | "date" | "bool";

export interface RegistryField {
  key: string;
  label: string;
  type: FieldType;
}

export interface RegistryConfig {
  table: string;
  label: string;
  nameKey: string;
  fields: RegistryField[];
}

export const REGISTRIES: RegistryConfig[] = [
  {
    table: "facility_practitioners",
    label: "Practitioners",
    nameKey: "name",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "position", label: "Position", type: "text" },
      { key: "license_number", label: "License #", type: "text" },
      { key: "license_expiration", label: "License Exp.", type: "date" },
      { key: "npi", label: "NPI", type: "text" },
      { key: "license_verified", label: "DOH Verified", type: "bool" },
      { key: "license_verified_date", label: "Verified On", type: "date" },
      { key: "l2_screening", label: "Level-2 Screening", type: "bool" },
      { key: "l2_screening_expiration", label: "L2 Exp.", type: "date" },
      { key: "discipline_on_file", label: "Discipline on File", type: "bool" },
      { key: "active", label: "Active", type: "bool" },
    ],
  },
  {
    table: "facility_vendors",
    label: "Vendors",
    nameKey: "organization_name",
    fields: [
      { key: "organization_name", label: "Organization", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "baa_signed", label: "BAA Signed", type: "bool" },
      { key: "baa_expiration", label: "BAA Exp.", type: "date" },
      { key: "contract_expiration", label: "Contract Exp.", type: "date" },
      { key: "anti_kickback_reviewed", label: "Anti-Kickback Reviewed", type: "bool" },
      { key: "anti_kickback_review_date", label: "AK Review Date", type: "date" },
      { key: "status", label: "Status", type: "text" },
    ],
  },
  {
    table: "facility_equipment",
    label: "Equipment",
    nameKey: "name",
    fields: [
      { key: "name", label: "Equipment", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "serial_number", label: "Serial #", type: "text" },
      { key: "last_calibration_date", label: "Last Calibration", type: "date" },
      { key: "next_calibration_due", label: "Next Due", type: "date" },
      { key: "calibration_company", label: "Calibration Co.", type: "text" },
      { key: "readiness_status", label: "Readiness", type: "text" },
    ],
  },
  {
    table: "facility_incidents",
    label: "Incidents",
    nameKey: "incident_number",
    fields: [
      { key: "incident_number", label: "Incident #", type: "text" },
      { key: "incident_date", label: "Date", type: "date" },
      { key: "type", label: "Type", type: "text" },
      { key: "patient_initials", label: "Patient Initials", type: "text" },
      { key: "reported_to_airs", label: "Reported to AIRS", type: "bool" },
      { key: "date_reported", label: "Date Reported", type: "date" },
      { key: "status", label: "Status", type: "text" },
      { key: "md_notes", label: "MD Notes", type: "text" },
    ],
  },
  {
    table: "facility_referral_contracts",
    label: "Referral Contracts",
    nameKey: "referring_entity",
    fields: [
      { key: "referring_entity", label: "Referring Entity", type: "text" },
      { key: "contract_type", label: "Type", type: "text" },
      { key: "effective_date", label: "Effective", type: "date" },
      { key: "expiration_date", label: "Expires", type: "date" },
      { key: "md_reviewed", label: "MD Reviewed", type: "bool" },
      { key: "reviewed_date", label: "Reviewed On", type: "date" },
    ],
  },
];

export type FacilityRow = Record<string, unknown> & { id?: string };

export type ExpiryStatus = "OK" | "EXPIRING" | "EXPIRED" | "MISSING";

/** Date-based compliance status: EXPIRED, EXPIRING within `windowDays`, else OK. */
export function expiryStatus(dateIso: unknown, today = new Date(), windowDays = 60): ExpiryStatus {
  if (!dateIso || typeof dateIso !== "string") return "MISSING";
  const d = new Date(dateIso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "MISSING";
  const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= windowDays) return "EXPIRING";
  return "OK";
}

/** Items needing attention across all registries (drives the panel banner and the report). */
export function complianceFlags(data: Record<string, FacilityRow[]>, today = new Date()): string[] {
  const flags: string[] = [];
  for (const p of data.facility_practitioners ?? []) {
    if (p.active === false) continue;
    const lic = expiryStatus(p.license_expiration, today);
    if (lic === "EXPIRED") flags.push(`Practitioner ${p.name}: license EXPIRED.`);
    if (lic === "EXPIRING") flags.push(`Practitioner ${p.name}: license expires within 60 days.`);
    if (lic === "MISSING") flags.push(`Practitioner ${p.name}: license expiration not on file.`);
    if (p.license_verified !== true) flags.push(`Practitioner ${p.name}: license not verified against DOH.`);
    if (p.l2_screening !== true) flags.push(`Practitioner ${p.name}: Level-2 screening not on file.`);
    if (p.discipline_on_file === true) flags.push(`Practitioner ${p.name}: discipline on file — MD review required.`);
  }
  for (const v of data.facility_vendors ?? []) {
    if (v.status === "inactive") continue;
    if (v.baa_signed !== true) flags.push(`Vendor ${v.organization_name}: no BAA signed.`);
    else if (expiryStatus(v.baa_expiration, today) === "EXPIRED") flags.push(`Vendor ${v.organization_name}: BAA expired.`);
    if (v.anti_kickback_reviewed !== true) flags.push(`Vendor ${v.organization_name}: anti-kickback review pending.`);
  }
  for (const e of data.facility_equipment ?? []) {
    const cal = expiryStatus(e.next_calibration_due, today);
    if (cal === "EXPIRED") flags.push(`Equipment ${e.name}: calibration OVERDUE.`);
    if (cal === "EXPIRING") flags.push(`Equipment ${e.name}: calibration due within 60 days.`);
  }
  for (const i of data.facility_incidents ?? []) {
    if (i.status !== "closed" && i.reported_to_airs !== true) {
      flags.push(`Incident ${i.incident_number || i.incident_date}: not yet reported to AIRS.`);
    }
  }
  for (const r of data.facility_referral_contracts ?? []) {
    if (r.md_reviewed !== true) flags.push(`Referral contract ${r.referring_entity}: MD review pending.`);
    if (expiryStatus(r.expiration_date, today) === "EXPIRED") flags.push(`Referral contract ${r.referring_entity}: expired.`);
  }
  return flags;
}

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cell(v: unknown, type: FieldType): string {
  if (type === "bool") return v === true ? "Yes" : v === false ? "No" : "—";
  return esc(v || "—");
}

/** Facility compliance attestation for the AHCA binder (PHI-free). */
export function buildFacilityReportHtml(args: {
  data: Record<string, FacilityRow[]>;
  reviewer: string;
  ahcaLicense: string;
  ahcaLicenseExpiration: string;
}): string {
  const flags = complianceFlags(args.data);
  const sections = REGISTRIES.map((reg) => {
    const rows = args.data[reg.table] ?? [];
    if (rows.length === 0) return `<h2>${reg.label}</h2><p>No entries on file.</p>`;
    const head = reg.fields.map((f) => `<th>${esc(f.label)}</th>`).join("");
    const body = rows
      .map((r) => `<tr>${reg.fields.map((f) => `<td>${cell(r[f.key], f.type)}</td>`).join("")}</tr>`)
      .join("");
    return `<h2>${reg.label} (${rows.length})</h2><table><tr>${head}</tr>${body}</table>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Facility Compliance</title>
  <style>
    body { font-family: Georgia, serif; color: #1a252f; margin: 36px; font-size: 12px; }
    .letterhead { text-align: center; border-bottom: 3px double #16a085; padding-bottom: 10px; margin-bottom: 16px; }
    .lh-name { font-size: 18px; font-weight: bold; color: #2c3e50; letter-spacing: 1px; }
    h1 { font-size: 15px; color: #2c3e50; border-bottom: 2px solid #f39c12; padding-bottom: 4px; }
    h2 { font-size: 12px; color: #16a085; text-transform: uppercase; margin: 14px 0 6px; }
    table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 10px; }
    td, th { border: 1px solid #b0bec5; padding: 3px 5px; text-align: left; }
    th { background: #eef5f4; }
    .flag { color: #e74c3c; }
    .sig { margin-top: 40px; } .sig-line { border-top: 1px solid #1a252f; width: 320px; padding-top: 4px; }
    @media print { body { margin: 14px; } }
  </style></head><body>
  <div class="letterhead"><div class="lh-name">${esc(CLINIC.name)}</div><div>${esc(CLINIC.address)}</div>
  <div>Phone: ${esc(CLINIC.phone)} | Fax: ${esc(CLINIC.fax)}</div>
  ${args.ahcaLicense ? `<div><strong>AHCA Health Care Clinic License:</strong> ${esc(args.ahcaLicense)}${args.ahcaLicenseExpiration ? ` (expires ${esc(args.ahcaLicenseExpiration)})` : ""}</div>` : ""}</div>
  <h1>FACILITY COMPLIANCE REGISTRY — AHCA BINDER</h1>
  <p>Administrative compliance registry maintained under the Medical Director's oversight (Health Care Clinic Act,
  § 400.9935, F.S.). This report contains no protected health information.</p>
  <h2>Open Items (${flags.length})</h2>
  ${flags.length === 0 ? "<p>No open compliance items.</p>" : `<ul>${flags.map((f) => `<li class="flag">${esc(f)}</li>`).join("")}</ul>`}
  ${sections}
  <p>I certify that the registries above are maintained under my oversight and are true and correct to the best of my knowledge.</p>
  <div class="sig"><div class="sig-line">${esc(args.reviewer || CLINIC.provider)} — Medical Director<br>License ${esc(CLINIC.license)} | NPI ${esc(CLINIC.npi)}<br>Date: ${new Date().toISOString().slice(0, 10)}</div></div>
  </body></html>`;
}
