import { CLINIC, DIAGNOSTIC_CENTER } from "./clinic";
import { EM_LEVELS, PT_MODALITIES, resolveImagingSelection } from "./cpt";
import { deriveIcd10, parseManualCodes, PSYCH_CODES } from "./icd10";
import { aggravationNarrative, imagingReviewNarrative, injuryNarrative, telehealthStatement } from "./narratives";
import { EXAM_REGIONS, GRADE_LABELS, JOINT_REGIONS, SPINE_REGION_IDS, SPINE_REGION_LABELS } from "./rom";
import type { DxCode, VisitForm } from "./types";
import { daysSinceAccident, weekBounds, weekNumber } from "./weeks";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function allDiagnosisCodes(form: VisitForm): DxCode[] {
  const auto = form.assessment.autoCodes.length ? form.assessment.autoCodes : deriveIcd10(form);
  const psych = PSYCH_CODES.filter((p) => form.assessment.psych.includes(p.code));
  const manual = parseManualCodes(form.assessment.manual);
  const seen = new Set<string>();
  return [...auto, ...psych, ...manual].filter((d) => (seen.has(d.code) ? false : (seen.add(d.code), true)));
}

export function allCptCodes(form: VisitForm): string[] {
  const out: string[] = [];
  if (form.plan.emLevel) out.push(form.plan.emLevel);
  out.push(...form.plan.modalities);
  for (const sel of form.imaging.selected) {
    const r = resolveImagingSelection(sel);
    if (r) out.push(r.item.cpt);
  }
  return [...new Set(out)];
}

const LETTERHEAD = `
  <div class="letterhead">
    <div class="lh-name">${esc(CLINIC.name)}</div>
    <div>${esc(CLINIC.address)}</div>
    <div>Phone: ${esc(CLINIC.phone)} | Fax: ${esc(CLINIC.fax)}</div>
    <div>${esc(CLINIC.provider)} — License ${esc(CLINIC.license)} — NPI ${esc(CLINIC.npi)}</div>
  </div>`;

const REPORT_CSS = `
  body { font-family: Georgia, "Times New Roman", serif; color: #1a252f; margin: 40px; font-size: 13px; }
  .letterhead { text-align: center; border-bottom: 3px double #16a085; padding-bottom: 10px; margin-bottom: 18px; }
  .lh-name { font-size: 19px; font-weight: bold; color: #2c3e50; letter-spacing: 1px; }
  h1 { font-size: 16px; color: #2c3e50; border-bottom: 2px solid #f39c12; padding-bottom: 4px; }
  h2 { font-size: 13px; color: #16a085; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 6px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  td, th { border: 1px solid #b0bec5; padding: 4px 8px; text-align: left; vertical-align: top; }
  th { background: #eef5f4; }
  .sig { margin-top: 44px; }
  .sig-line { border-top: 1px solid #1a252f; width: 320px; padding-top: 4px; }
  .narrative { font-style: italic; }
  @media print { body { margin: 16px; } }
`;

function wrap(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${REPORT_CSS}</style></head><body>${LETTERHEAD}${body}</body></html>`;
}

function patientBlock(form: VisitForm): string {
  const p = form.patient;
  return `<table>
    <tr><th>Patient</th><td>${esc(p.firstName)} ${esc(p.lastName)}</td><th>DOB</th><td>${esc(p.dob)}</td></tr>
    <tr><th>Sex</th><td>${esc(p.sex)}</td><th>Visit Date</th><td>${esc(form.visitDate)}</td></tr>
    <tr><th>Insurance</th><td>${esc(p.insuranceCarrier)}</td><th>Policy #</th><td>${esc(p.policyNumber)}</td></tr>
    <tr><th>Accident Date</th><td>${esc(form.accident.accidentDate)}</td><th>Visit Type</th><td>${esc(form.visitType.toUpperCase())} — ${form.visitMode === "telehealth" ? "TELEHEALTH (facility-originated)" : "IN PERSON"}</td></tr>
  </table>`;
}

function signature(): string {
  return `<div class="sig"><div class="sig-line">${esc(CLINIC.provider)}<br>License ${esc(CLINIC.license)} | NPI ${esc(CLINIC.npi)}</div></div>`;
}

/** Full clinical note (physician visit). */
export function buildClinicalNoteHtml(form: VisitForm): string {
  const titles = { initial: "INITIAL EVALUATION", followup: "FOLLOW-UP EVALUATION", final: "FINAL EVALUATION / DISCHARGE" };
  let b = `<h1>${titles[form.visitType]}</h1>${patientBlock(form)}`;

  if (form.visitMode === "telehealth") {
    b += `<h2>Telehealth Encounter Statement</h2><p class="narrative">${esc(telehealthStatement(form.telehealth))}</p>`;
  }

  const narr = injuryNarrative(form.patient, form.accident);
  if (narr) b += `<h2>History of Present Illness</h2><p class="narrative">${esc(narr)}</p>`;
  const agg = aggravationNarrative(form.pmh, form.accident.accidentType);
  if (agg) b += `<p class="narrative">${esc(agg)}</p>`;

  const g = form.gen;
  if (g.bp || g.pulse || g.resp || g.temp) {
    const vitalsBy = form.visitMode === "telehealth" ? " (measured by on-site clinic staff)" : "";
    b += `<h2>Vitals${vitalsBy}</h2><table><tr><th>BP</th><td>${esc(g.bp)}</td><th>Pulse</th><td>${esc(g.pulse)}</td><th>Resp</th><td>${esc(g.resp)}</td><th>Temp</th><td>${esc(g.temp)}</td></tr></table>`;
  }
  const exam: string[] = [];
  if (g.appearance) exam.push(`Appearance: ${g.appearance}.`);
  if (g.posture) exam.push(`Posture: ${g.posture}.`);
  if (g.mood) exam.push(`Mood/Affect: ${g.mood}.`);
  if (g.cognition) exam.push(`Cognition: ${g.cognition}.`);
  if (exam.length) b += `<h2>General Examination</h2><p>${esc(exam.join(" "))}</p>`;

  // Spine table — tenderness/spasm are hands-on findings, reported in person only
  const inPerson = form.visitMode === "inPerson";
  const spineRows = SPINE_REGION_IDS.map((id) => {
    const row = form.spineExam[id];
    if (!row || (!row.tenderness && !row.spasm && !row.rom)) return "";
    const yn = (v: string) => (v === "yes" ? "Present" : v === "no" ? "Absent" : "—");
    const handsOn = inPerson
      ? `<td>${yn(row.tenderness)}</td><td>${yn(row.spasm)}</td>`
      : `<td>Not assessed (telehealth)</td><td>Not assessed (telehealth)</td>`;
    return `<tr><td>${SPINE_REGION_LABELS[id]}</td>${handsOn}<td>${row.rom ? GRADE_LABELS[row.rom] : "—"}</td></tr>`;
  }).filter(Boolean);
  if (spineRows.length) {
    b += `<h2>Spine Examination</h2><table><tr><th>Region</th><th>Tenderness</th><th>Spasm</th><th>ROM</th></tr>${spineRows.join("")}</table>`;
  }

  // Functional maneuvers (observed; valid for both modalities). Normal values are
  // reference ranges only — no measured or estimated degrees are recorded.
  const romRows: string[] = [];
  for (const region of EXAM_REGIONS) {
    for (const mv of region.maneuvers) {
      const grade = form.romExam[mv.id];
      if (!grade) continue;
      romRows.push(
        `<tr><td>${esc(region.label)}</td><td>${esc(mv.label)}</td><td>${GRADE_LABELS[grade]}</td><td>Normal: ${esc(mv.normalLabel)}</td></tr>`,
      );
    }
  }
  if (romRows.length) {
    b += `<h2>Functional Examination${form.visitMode === "telehealth" ? " (observed via synchronous audio-video)" : ""}</h2><table><tr><th>Region</th><th>Maneuver</th><th>Result</th><th>Reference</th></tr>${romRows.join("")}</table>`;
  }

  if (inPerson) {
    const tendRows = JOINT_REGIONS.map((r) => {
      const t = form.jointTenderness[r.id];
      if (!t || (!t.R && !t.L)) return "";
      const yn = (v: string) => (v === "yes" ? "Present" : v === "no" ? "Absent" : "—");
      return `<tr><td>${esc(r.label)}</td><td>${yn(t.R ?? "")}</td><td>${yn(t.L ?? "")}</td></tr>`;
    }).filter(Boolean);
    if (tendRows.length) {
      b += `<h2>Joint Tenderness</h2><table><tr><th>Joint</th><th>Right</th><th>Left</th></tr>${tendRows.join("")}</table>`;
    }
  }

  const dx = allDiagnosisCodes(form);
  if (dx.length) {
    b += `<h2>Assessment — ICD-10 Diagnoses</h2><table><tr><th>Code</th><th>Description</th></tr>${dx
      .map((d) => `<tr><td>${esc(d.code)}</td><td>${esc(d.desc)}</td></tr>`)
      .join("")}</table>`;
  }

  if (form.visitType === "followup") {
    const rev = imagingReviewNarrative(form.imagingReview);
    if (rev) b += `<h2>Imaging Review</h2><p class="narrative">${esc(rev)}</p>`;
  }

  const pl = form.plan;
  if (pl.emLevel || pl.medicalNecessity || pl.modalities.length) {
    const em = EM_LEVELS.find((e) => e.code === pl.emLevel)?.label ?? pl.emLevel;
    b += `<h2>Plan of Treatment</h2>`;
    if (em) b += `<p><strong>E/M Level:</strong> ${esc(em)}</p>`;
    if (pl.medicalNecessity) b += `<p><strong>Medical Necessity:</strong> ${esc(pl.medicalNecessity)}</p>`;
    if (pl.modalities.length) {
      const mods = PT_MODALITIES.filter((m) => pl.modalities.includes(m.cpt));
      b += `<p><strong>PT:</strong> ${esc(pl.ptFrequency)} for ${esc(pl.ptDuration)}.</p><table><tr><th>CPT</th><th>Modality</th></tr>${mods
        .map((m) => `<tr><td>${m.cpt}</td><td>${esc(m.name)}</td></tr>`)
        .join("")}</table>`;
    }
    if (pl.followUp) b += `<p><strong>Follow-up:</strong> ${esc(pl.followUp)}</p>`;
  }

  if (form.visitType === "final") {
    const d = form.discharge;
    b += `<h2>Discharge Summary</h2><table>
      <tr><th>Overall Outcome</th><td>${esc(d.outcome)}</td></tr>
      <tr><th>Return to Work</th><td>${esc(d.returnToWork)}</td></tr>
      <tr><th>Return to Activities</th><td>${esc(d.returnToActivities)}</td></tr>
      <tr><th>Residual Issues</th><td>${d.residualIssues === "yes" ? esc(d.residualNote) : "None"}</td></tr>
      <tr><th>Apparent Sequelae</th><td>${esc(d.sequelae || "None")}</td></tr>
      <tr><th>Continued Care</th><td>${d.continuedCare === "yes" ? esc(d.continuedCareNote) : "Not required"}</td></tr>
    </table><p><strong>Case status: CLOSED.</strong></p>`;
  }

  return wrap(`Clinical Note — ${form.patient.lastName}`, b + signature());
}

/** X-Ray order on clinic letterhead, addressed to MAZEL. */
export function buildXrayOrderHtml(form: VisitForm): string {
  const dx = allDiagnosisCodes(form);
  const rows = form.imaging.selected
    .map((sel) => {
      const r = resolveImagingSelection(sel);
      if (!r) return "";
      const side = r.side ? ` (${r.side === "R" ? "Right" : "Left"})` : "";
      return `<tr><td>X-Ray</td><td>${esc(r.item.label)}${side}</td><td>${r.item.cpt}</td></tr>`;
    })
    .filter(Boolean);
  if (form.imaging.mriRegion) rows.push(`<tr><td>MRI</td><td>${esc(form.imaging.mriRegion)}</td><td>—</td></tr>`);
  if (form.imaging.ctRegion) rows.push(`<tr><td>CT</td><td>${esc(form.imaging.ctRegion)}</td><td>—</td></tr>`);
  if (form.imaging.usRegion) rows.push(`<tr><td>Ultrasound</td><td>${esc(form.imaging.usRegion)}</td><td>—</td></tr>`);

  const b = `<h1>DIAGNOSTIC IMAGING ORDER</h1>
    <p><strong>To:</strong> ${esc(DIAGNOSTIC_CENTER.name)}<br>${esc(DIAGNOSTIC_CENTER.address)}<br>
    Phone: ${esc(DIAGNOSTIC_CENTER.phone)} | Fax: ${esc(DIAGNOSTIC_CENTER.fax)}</p>
    ${patientBlock(form)}
    <h2>Studies Ordered</h2>
    <table><tr><th>Modality</th><th>Region</th><th>CPT</th></tr>${rows.join("")}</table>
    <h2>Reason for Encounter (ICD-10)</h2>
    <table><tr><th>Code</th><th>Description</th></tr>${dx
      .map((d) => `<tr><td>${esc(d.code)}</td><td>${esc(d.desc)}</td></tr>`)
      .join("")}</table>
    ${signature()}`;
  return wrap(`X-Ray Order — ${form.patient.lastName}`, b);
}

/** PT report (daily session or weekly summary). */
export function buildPtReportHtml(form: VisitForm, kind: "ptdaily" | "ptprogress"): string {
  let b: string;
  if (kind === "ptdaily") {
    const s = form.ptDaily;
    const mods = PT_MODALITIES.filter((m) => s.treatments.includes(m.cpt));
    b = `<h1>PHYSICAL THERAPY DAILY SESSION NOTE</h1>${patientBlock(form)}
      <table>
        <tr><th>Session Type</th><td>${esc(s.sessionType)}</td><th>Pain Level</th><td>${esc(s.painLevel)}/10</td></tr>
        <tr><th>Compliance</th><td>${esc(s.compliance)}</td><th>Progress</th><td>${esc(s.progress)}</td></tr>
      </table>
      <h2>Treatments Provided</h2>
      <table><tr><th>CPT</th><th>Treatment</th></tr>${mods.map((m) => `<tr><td>${m.cpt}</td><td>${esc(m.name)}</td></tr>`).join("")}</table>
      ${s.modifications === "yes" ? `<p><strong>Modifications:</strong> ${esc(s.modificationsNote)}</p>` : ""}
      ${s.homework === "yes" ? `<p><strong>Home Exercise Program:</strong> ${esc(s.homeworkNote)}</p>` : ""}`;
  } else {
    const w = form.ptWeekly;
    const acc = form.accident.accidentDate;
    const bounds = weekBounds(form.visitDate);
    const days = acc ? daysSinceAccident(acc, form.visitDate) : null;
    const wk = acc ? weekNumber(acc, form.visitDate) : null;
    const dayRows = Object.entries(w.dayNotes)
      .sort(([a], [b2]) => a.localeCompare(b2))
      .map(
        ([date, v]) =>
          `<tr><td>${esc(date)}${acc ? ` (Day ${daysSinceAccident(acc, date)})` : ""}</td><td>${esc(v.pain)}</td><td>${esc(v.note)}</td></tr>`,
      );
    b = `<h1>PHYSICAL THERAPY WEEKLY SUMMARY</h1>${patientBlock(form)}
      <table>
        <tr><th>Week</th><td>${bounds.start} — ${bounds.end}${wk ? ` (Week ${wk})` : ""}</td><th>Days Since Accident</th><td>${days ?? "—"}</td></tr>
        <tr><th>Overall Progress</th><td>${esc(w.overallProgress)}</td><th>Pain Trend</th><td>${esc(w.painTrend)}</td></tr>
        <tr><th>Sessions Attended</th><td>${esc(w.sessionsAttended)}/5</td><th>Compliance</th><td>${esc(w.compliancePct)}%</td></tr>
      </table>
      ${w.functionalImprovements === "yes" ? `<p><strong>Functional Improvements:</strong> ${esc(w.functionalNote)}</p>` : ""}
      ${dayRows.length ? `<h2>Day-by-Day Progress</h2><table><tr><th>Date</th><th>Pain</th><th>Notes</th></tr>${dayRows.join("")}</table>` : ""}
      ${w.planNextWeek ? `<p><strong>Plan for Next Week:</strong> ${esc(w.planNextWeek)}</p>` : ""}`;
  }
  return wrap(`PT Note — ${form.patient.lastName}`, b + signature());
}

/** Open a print window for the generated HTML (print → Save as PDF). */
export function printHtml(html: string): void {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
