import { CLINIC } from "./clinic";
import type { VisitForm } from "./types";

/**
 * Inspection-point model adapted from the AHCA Pro platform's chart-review
 * system: Y/N/NA per point, per-chart score, PASS/MONITOR/CORRECTIVE/ESCALATION
 * status ladder, MD overrides, and an AHCA-binder QA report.
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

/** Status ladder mirroring AHCA Pro's PASS/MONITOR/CORRECTIVE/ESCALATION levels. */
export function statusFor(pct: number | null): ChartStatus {
  if (pct === null || pct === 100) return "PASS";
  if (pct >= 80) return "MONITOR";
  if (pct >= 60) return "CORRECTIVE";
  return "ESCALATION";
}

export function worstStatus(statuses: ChartStatus[]): ChartStatus {
  const order: ChartStatus[] = ["PASS", "MONITOR", "CORRECTIVE", "ESCALATION"];
  return statuses.reduce<ChartStatus>((acc, s) => (order.indexOf(s) > order.indexOf(acc) ? s : acc), "PASS");
}

export interface ChartReviewItem {
  reportId: string;
  patientLabel: string;
  dos: string;
  mode: string;
  telehealth: boolean;
  evaluation: ChartEvaluation;
  /** point ids the MD changed from the auto evaluation (AHCA Pro md_overrides) */
  mdOverrides: string[];
  comments: string;
}

export const MIN_CHARTS = 5;
export const MAX_CHARTS = 10;

export function itemComplete(i: ChartReviewItem): boolean {
  // every manual point must be resolved (not left NA by default is allowed only for true NA;
  // we require the MD to have touched authority + incident or left an explicit comment)
  return AUDIT_POINTS.every((p) => i.evaluation[p.id] !== undefined);
}

/** Random sample without replacement. */
export function sampleCharts<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const STATUS_COLOR: Record<ChartStatus, string> = {
  PASS: "#27ae60",
  MONITOR: "#f39c12",
  CORRECTIVE: "#e67e22",
  ESCALATION: "#e74c3c",
};

/** AHCA-style Medical Director audit report for the compliance binder. */
export function buildGovernanceReportHtml(args: {
  month: string;
  targetCount: number;
  totalChartsInMonth: number;
  items: ChartReviewItem[];
  reviewer: string;
  followUp: string;
}): string {
  const { month, items } = args;
  const perChart = items.map((i) => {
    const s = chartScore(i.evaluation);
    return { item: i, score: s, status: statusFor(s.pct) };
  });
  const deficiencies = perChart.reduce((acc, c) => acc + c.score.no, 0);
  const overall = worstStatus(perChart.map((c) => c.status));
  const agg = (() => {
    const yes = perChart.reduce((a, c) => a + c.score.yes, 0);
    const no = deficiencies;
    return yes + no === 0 ? null : Math.round((yes / (yes + no)) * 100);
  })();

  const matrix = perChart
    .map(({ item, score, status }, n) => {
      const cells = AUDIT_POINTS.map((p) => {
        const r = item.evaluation[p.id];
        const overridden = item.mdOverrides.includes(p.id) ? "*" : "";
        return `<td style="text-align:center">${r ? r.value : ""}${overridden}</td>`;
      }).join("");
      return `<tr><td>${n + 1}</td><td>${esc(item.patientLabel)}</td><td>${esc(item.dos)}</td><td>${esc(item.mode)}${item.telehealth ? " (TH)" : ""}</td>${cells}
        <td>${score.pct === null ? "—" : `${score.pct}%`}</td>
        <td style="color:${STATUS_COLOR[status]}; font-weight:bold">${status}</td>
        <td>${esc(item.comments)}</td></tr>`;
    })
    .join("");
  const pointHeaders = AUDIT_POINTS.map((_, i) => `<th>P${i + 1}</th>`).join("");
  const legend = AUDIT_POINTS.map((p, i) => `<tr><td><strong>P${i + 1}</strong></td><td>${esc(p.label)}</td></tr>`).join("");
  const shortSample =
    args.totalChartsInMonth < args.targetCount
      ? `<p>Note: only ${args.totalChartsInMonth} chart(s) were generated during this period; all available charts were reviewed.</p>`
      : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>MD Audit — ${esc(month)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a252f; margin: 36px; font-size: 12px; }
    .letterhead { text-align: center; border-bottom: 3px double #16a085; padding-bottom: 10px; margin-bottom: 16px; }
    .lh-name { font-size: 18px; font-weight: bold; color: #2c3e50; letter-spacing: 1px; }
    h1 { font-size: 15px; color: #2c3e50; border-bottom: 2px solid #f39c12; padding-bottom: 4px; }
    h2 { font-size: 12px; color: #16a085; text-transform: uppercase; margin: 14px 0 6px; }
    table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 10px; }
    td, th { border: 1px solid #b0bec5; padding: 3px 5px; text-align: left; vertical-align: top; }
    th { background: #eef5f4; }
    .kpi { display: inline-block; margin-right: 24px; font-size: 12px; }
    .kpi b { font-size: 16px; }
    .sig { margin-top: 40px; } .sig-line { border-top: 1px solid #1a252f; width: 320px; padding-top: 4px; }
    @media print { body { margin: 14px; } }
  </style></head><body>
  <div class="letterhead"><div class="lh-name">${esc(CLINIC.name)}</div><div>${esc(CLINIC.address)}</div>
  <div>Phone: ${esc(CLINIC.phone)} | Fax: ${esc(CLINIC.fax)}</div></div>
  <h1>MEDICAL DIRECTOR CHART AUDIT REPORT — AHCA COMPLIANCE BINDER</h1>
  <p>
    <span class="kpi">Period<br><b>${esc(month)}</b></span>
    <span class="kpi">Total encounters<br><b>${args.totalChartsInMonth}</b></span>
    <span class="kpi">Charts reviewed<br><b>${items.length}</b></span>
    <span class="kpi">Deficiencies<br><b>${deficiencies}</b></span>
    <span class="kpi">Aggregate score<br><b>${agg === null ? "—" : `${agg}%`}</b></span>
    <span class="kpi">Overall status<br><b style="color:${STATUS_COLOR[overall]}">${overall}</b></span>
  </p>
  <p>This audit was conducted pursuant to the Medical Director's responsibilities under the Florida Health Care Clinic Act,
  § 400.9935, Florida Statutes, including the systematic review of clinic billings against the clinical record to ensure
  billings are not fraudulent or unlawful, verification of provider authority, and review of documentation standards.
  Each chart was evaluated against the inspection points below (Y = met, N = deficiency, NA = not applicable;
  * = Medical Director override of the system's pre-evaluation).</p>
  ${shortSample}
  <h2>Chart Matrix</h2>
  <table><tr><th>#</th><th>Patient</th><th>DOS</th><th>Type</th>${pointHeaders}<th>Score</th><th>Status</th><th>Comments / Corrective Action</th></tr>${matrix}</table>
  <h2>Inspection Points</h2>
  <table>${legend}</table>
  <h2>Follow-Up / Corrective Action Plan</h2>
  <p>${esc(args.followUp || "None required. Routine monitoring continues.")}</p>
  <p>I certify that I personally reviewed the charts listed above, that billings were matched against the clinical record,
  and that the findings recorded are true and correct to the best of my medical judgment.</p>
  <div class="sig"><div class="sig-line">${esc(args.reviewer || CLINIC.provider)} — Medical Director<br>License ${esc(CLINIC.license)} | NPI ${esc(CLINIC.npi)}<br>Date: ${new Date().toISOString().slice(0, 10)}</div></div>
  </body></html>`;
}
