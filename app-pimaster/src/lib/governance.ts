import { CLINIC } from "./clinic";

export interface ChartReviewItem {
  reportId: string;
  patientLabel: string;
  dos: string;
  mode: string;
  /** review checklist */
  documentationComplete: boolean;
  codingSupported: boolean;
  necessitySupported: boolean;
  telehealthCompliant: boolean | null; // null = not a telehealth chart
  finding: "" | "compliant" | "minor" | "significant";
  comments: string;
}

export const MIN_CHARTS = 5;
export const MAX_CHARTS = 10;

export function emptyItem(r: { id: string; patient_label: string; dos: string; mode: string; telehealth: boolean }): ChartReviewItem {
  return {
    reportId: r.id,
    patientLabel: r.patient_label,
    dos: r.dos,
    mode: r.mode,
    documentationComplete: false,
    codingSupported: false,
    necessitySupported: false,
    telehealthCompliant: r.telehealth ? false : null,
    finding: "",
    comments: "",
  };
}

export function itemComplete(i: ChartReviewItem): boolean {
  return i.finding !== "";
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

const FINDING_LABELS: Record<string, string> = {
  compliant: "Compliant",
  minor: "Minor deficiency — corrective note",
  significant: "Significant deficiency — corrective action required",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Monthly Medical Director chart-review report for the AHCA compliance binder. */
export function buildGovernanceReportHtml(args: {
  month: string; // YYYY-MM
  targetCount: number;
  totalChartsInMonth: number;
  items: ChartReviewItem[];
  reviewer: string;
}): string {
  const { month, items } = args;
  const compliant = items.filter((i) => i.finding === "compliant").length;
  const minor = items.filter((i) => i.finding === "minor").length;
  const significant = items.filter((i) => i.finding === "significant").length;
  const yn = (v: boolean | null) => (v === null ? "N/A" : v ? "Yes" : "No");
  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(i.dos)}</td><td>${esc(i.patientLabel)}</td><td>${esc(i.mode)}</td>
         <td>${yn(i.documentationComplete)}</td><td>${yn(i.codingSupported)}</td><td>${yn(i.necessitySupported)}</td><td>${yn(i.telehealthCompliant)}</td>
         <td>${esc(FINDING_LABELS[i.finding] ?? "")}</td><td>${esc(i.comments)}</td></tr>`,
    )
    .join("");
  const shortSample =
    args.totalChartsInMonth < args.targetCount
      ? `<p>Note: only ${args.totalChartsInMonth} chart(s) were generated during this period; all available charts were reviewed.</p>`
      : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>MD Chart Review — ${esc(month)}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a252f; margin: 40px; font-size: 13px; }
    .letterhead { text-align: center; border-bottom: 3px double #16a085; padding-bottom: 10px; margin-bottom: 18px; }
    .lh-name { font-size: 19px; font-weight: bold; color: #2c3e50; letter-spacing: 1px; }
    h1 { font-size: 16px; color: #2c3e50; border-bottom: 2px solid #f39c12; padding-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 11px; }
    td, th { border: 1px solid #b0bec5; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #eef5f4; }
    .sig { margin-top: 44px; } .sig-line { border-top: 1px solid #1a252f; width: 320px; padding-top: 4px; }
    @media print { body { margin: 16px; } }
  </style></head><body>
  <div class="letterhead"><div class="lh-name">${esc(CLINIC.name)}</div><div>${esc(CLINIC.address)}</div>
  <div>Phone: ${esc(CLINIC.phone)} | Fax: ${esc(CLINIC.fax)}</div></div>
  <h1>MEDICAL DIRECTOR MONTHLY CHART REVIEW — AHCA COMPLIANCE BINDER</h1>
  <p><strong>Review period:</strong> ${esc(month)} &nbsp;&nbsp; <strong>Charts reviewed:</strong> ${items.length} (target ${args.targetCount}, minimum ${MIN_CHARTS})
  &nbsp;&nbsp; <strong>Medical Director:</strong> ${esc(args.reviewer || CLINIC.provider)}</p>
  <p>This review was conducted pursuant to the Medical Director's responsibilities under the Florida Health Care Clinic Act,
  § 400.9935, Florida Statutes, including the duty to conduct systematic reviews of clinic billings and clinical records to
  ensure that billings are not fraudulent or unlawful, and to ensure compliance with applicable documentation standards.</p>
  ${shortSample}
  <table><tr><th>DOS</th><th>Patient</th><th>Note Type</th><th>Documentation Complete</th><th>Coding Supported</th><th>Medical Necessity Supported</th><th>Telehealth Requirements Met</th><th>Finding</th><th>Comments / Corrective Action</th></tr>${rows}</table>
  <p><strong>Summary:</strong> ${compliant} compliant · ${minor} minor deficiency(ies) · ${significant} significant deficiency(ies).</p>
  <p>I certify that I personally reviewed the charts listed above and that the findings recorded are true and correct to the
  best of my medical judgment.</p>
  <div class="sig"><div class="sig-line">${esc(args.reviewer || CLINIC.provider)} — Medical Director<br>License ${esc(CLINIC.license)} | NPI ${esc(CLINIC.npi)}<br>Date: ${new Date().toISOString().slice(0, 10)}</div></div>
  </body></html>`;
}
