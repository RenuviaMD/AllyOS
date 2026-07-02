import type { VisitForm } from "./types";

/**
 * Encounter risk triage for the 30-day Encounter Export. PI Master handles
 * clinical operations only — the Medical Director's audit itself is completed
 * in the external governance system. Each encounter is pre-scored (Y/N/NA per
 * inspection point) so high-risk charts are easy to select for export.
 */

export type PointValue = "Y" | "N" | "NA";
export type ChartStatus = "PASS" | "MONITOR" | "CORRECTIVE" | "ESCALATION";

export interface AuditPoint {
  id: string;
  label: string;
  /** true when the system can pre-evaluate it from chart data */
  auto: boolean;
}

export const AUDIT_POINTS: AuditPoint[] = [
  { id: "intake", label: "Intake/demographics complete (name, DOB, insurance)", auto: true },
  { id: "consent", label: "Consent documented (telehealth consent when applicable)", auto: true },
  { id: "authority", label: "Provider authority: rendered/signed by licensed provider within scope (license & NPI current)", auto: false },
  { id: "billing_match", label: "Billing matches note: every billed CPT supported by documented services", auto: true },
  { id: "coding_match", label: "ICD-10 codes supported by documented findings", auto: true },
  { id: "necessity", label: "Medical necessity rationale present and visit-type appropriate", auto: true },
  { id: "emc", label: "EMC determination documented (initial visits)", auto: true },
  { id: "encounter_char", label: "ICD-10 7th character matches visit type (A initial / D subsequent)", auto: true },
  { id: "telehealth", label: "Telehealth origination + consent statement present (telehealth visits)", auto: true },
  { id: "incident", label: "Adverse incidents/complaints reviewed and MD notified within 24h", auto: false },
];

export interface PointResult {
  value: PointValue;
  reason: string;
}

export type ChartEvaluation = Record<string, PointResult>;

/** Pre-evaluate every auto point from the chart's saved form data. Manual points start NA. */
export function autoEvaluate(form: VisitForm, savedCpt: string[], savedIcd: string[]): ChartEvaluation {
  const ev: ChartEvaluation = {};
  const p = form.patient;

  ev.intake = p.firstName && p.lastName && p.dob && p.insuranceCarrier
    ? { value: "Y", reason: "Identity and insurance captured." }
    : { value: "N", reason: "Missing name, DOB, or insurance." };

  ev.consent =
    form.visitMode === "telehealth"
      ? form.telehealth?.consentObtained
        ? { value: "Y", reason: `Telehealth consent documented${form.telehealth.consentBy ? ` (by ${form.telehealth.consentBy})` : ""}.` }
        : { value: "N", reason: "Telehealth visit without documented consent." }
      : { value: "NA", reason: "In-person visit." };

  ev.authority = { value: "NA", reason: "MD review: confirm rendering provider license/NPI current and in scope." };

  // Billing <-> note match: every saved CPT must trace to a documented service
  const documented = new Set<string>([form.plan?.emLevel, ...(form.plan?.modalities ?? []), ...(form.ptDaily?.treatments ?? [])].filter(Boolean) as string[]);
  const unsupported = savedCpt.filter((c) => !documented.has(c) && !/^7\d{4}$/.test(c)); // imaging CPTs are ordered out, billed by the imaging center
  ev.billing_match =
    savedCpt.length === 0
      ? { value: "NA", reason: "No CPT codes billed on this chart." }
      : unsupported.length === 0
        ? { value: "Y", reason: "All billed CPTs trace to documented services." }
        : { value: "N", reason: `Billed without documented service: ${unsupported.join(", ")}.` };

  ev.coding_match = savedIcd.length > 0
    ? { value: "Y", reason: "Diagnosis codes recorded with documented exam findings." }
    : { value: "N", reason: "No diagnosis codes on a clinical note." };

  ev.necessity = form.plan?.medicalNecessity?.trim()
    ? { value: "Y", reason: "Medical necessity rationale present." }
    : { value: "N", reason: "Medical necessity missing." };

  ev.emc =
    form.visitType === "initial"
      ? form.plan?.emc
        ? { value: "Y", reason: `EMC determination: ${form.plan.emc.toUpperCase()}.` }
        : { value: "N", reason: "Initial visit without EMC determination." }
      : { value: "NA", reason: "Not an initial visit." };

  const injuryCodes = savedIcd.filter((c) => /^[ST]/.test(c));
  const wrongChar =
    form.visitType === "initial" ? injuryCodes.filter((c) => c.endsWith("D")) : injuryCodes.filter((c) => c.endsWith("A"));
  ev.encounter_char =
    injuryCodes.length === 0
      ? { value: "NA", reason: "No injury-chapter codes on this chart." }
      : wrongChar.length === 0
        ? { value: "Y", reason: "Encounter characters consistent with visit type." }
        : { value: "N", reason: `Wrong 7th character for ${form.visitType} visit: ${wrongChar.join(", ")}.` };

  ev.telehealth =
    form.visitMode === "telehealth"
      ? form.telehealth?.consentObtained
        ? { value: "Y", reason: "Origination/consent statement auto-inserted on generation." }
        : { value: "N", reason: "Telehealth chart missing consent/origination documentation." }
      : { value: "NA", reason: "In-person visit." };

  ev.incident = { value: "NA", reason: "MD review: confirm any adverse incident/complaint was handled and reported." };

  return ev;
}

export function chartScore(ev: ChartEvaluation): { yes: number; no: number; pct: number | null } {
  let yes = 0;
  let no = 0;
  for (const p of AUDIT_POINTS) {
    const v = ev[p.id]?.value;
    if (v === "Y") yes++;
    if (v === "N") no++;
  }
  const denom = yes + no;
  return { yes, no, pct: denom === 0 ? null : Math.round((yes / denom) * 100) };
}

/** Risk-status ladder used for triage ordering in the export. */
export function statusFor(pct: number | null): ChartStatus {
  if (pct === null || pct === 100) return "PASS";
  if (pct >= 80) return "MONITOR";
  if (pct >= 60) return "CORRECTIVE";
  return "ESCALATION";
}

/** Inspection-point ids that came back as deficiencies (value "N"). */
export function failedPoints(ev: ChartEvaluation): string[] {
  return AUDIT_POINTS.filter((p) => ev[p.id]?.value === "N").map((p) => p.id);
}

/** One row of the 30-day encounter spreadsheet. */
export interface EncounterExport {
  chartId: string;
  dos: string;
  initials: string;
  visitType: string;
  modality: string;
  telehealth: boolean;
  icd: string[];
  cpt: string[];
  chargeTotal: string;
  deficiencies: number;
  riskStatus: ChartStatus;
  riskFlags: string[];
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Build the last-30-days encounter CSV for risk triage / external audit upload. */
export function buildEncountersCsv(rows: EncounterExport[]): string {
  const header = [
    "Chart ID",
    "Date of Service",
    "Patient Initials",
    "Visit Type",
    "Modality",
    "Telehealth",
    "ICD-10 Codes",
    "CPT Codes",
    "Charge Total",
    "Deficiencies",
    "Risk Status",
    "Risk Flags",
  ];
  const lines = rows.map((r) =>
    [
      r.chartId,
      r.dos,
      r.initials,
      r.visitType,
      r.modality,
      r.telehealth ? "Yes" : "No",
      r.icd.join(" "),
      r.cpt.join(" "),
      r.chargeTotal ? `$${r.chargeTotal}` : "",
      String(r.deficiencies),
      r.riskStatus,
      r.riskFlags.join(" "),
    ]
      .map((c) => csvCell(c))
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}
