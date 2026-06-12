import { totalCharges, type BillingSettings, type ServiceLine } from "./billing";
import { CLINIC, DIAGNOSTIC_CENTER } from "./clinic";
import { EM_LEVELS, PT_MODALITIES, resolveImagingSelection } from "./cpt";
import { deriveIcd10, parseManualCodes, PSYCH_CODES } from "./icd10";
import {
  aggravationNarrative,
  causationStatement,
  certificationStatement,
  imagingReviewNarrative,
  injuryNarrative,
  prognosisStatement,
  telehealthStatement,
} from "./narratives";
import { EXAM_REGIONS, GRADE_LABELS, impairedSides, JOINT_REGIONS, SPINE_REGION_IDS, SPINE_REGION_LABELS } from "./rom";
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

  if (form.visitType === "initial" && form.plan.emc) {
    const emcText = { yes: "YES — the patient has an Emergency Medical Condition as defined under Florida Statute § 627.736. A Certification of Emergency Medical Condition has been issued.", no: "NO — no Emergency Medical Condition was identified on today's evaluation.", deferred: "DEFERRED — determination pending further evaluation and diagnostic correlation." }[form.plan.emc];
    b += `<h2>Emergency Medical Condition Determination</h2><p>${esc(emcText)}</p>`;
  }

  const caus = causationStatement(form.plan.causation, form.accident.accidentDate, form.accident.accidentType);
  if (caus) b += `<h2>Causation Statement</h2><p class="narrative">${esc(caus)}</p>`;
  const prog = prognosisStatement(form.plan.prognosis);
  if (prog) b += `<h2>Prognosis</h2><p class="narrative">${esc(prog)}</p>`;

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

  b += `<h2>Physician Certification</h2><p>${esc(certificationStatement())}</p>`;

  return wrap(`Clinical Note — ${form.patient.lastName}`, b + signature());
}

/** EMC region checkboxes derived from documented findings (mirrors the clinic's certification form). */
export function emcRegions(form: VisitForm): { label: string; checked: boolean }[] {
  const has = (id: string) => impairedSides(id, form).length > 0;
  return [
    { label: "HEAD", checked: false },
    { label: "CERVICAL REGION", checked: has("cervical") },
    { label: "THORACIC REGION", checked: has("thoracic") },
    { label: "LUMBAR REGION", checked: has("lumbar") },
    { label: "UPPER EXTREMITIES", checked: has("shoulder") || has("elbow") || has("wrist") },
    { label: "LOWER EXTREMITIES", checked: has("hip") || has("knee") || has("ankle") },
    { label: "OTHER", checked: false },
  ];
}

/** Certification of Emergency Medical Condition — replicates the clinic's existing form. */
export function buildEmcCertificationHtml(form: VisitForm): string {
  const dx = allDiagnosisCodes(form);
  const half = Math.ceil(dx.length / 2);
  const rows: string[] = [];
  for (let i = 0; i < half; i++) {
    const left = dx[i];
    const right = dx[i + half];
    rows.push(
      `<tr><td>${esc(left.code)}</td><td>${esc(left.desc)}</td><td>${right ? esc(right.code) : ""}</td><td>${right ? esc(right.desc) : ""}</td></tr>`,
    );
  }
  const regions = emcRegions(form)
    .map((r) => `<span style="margin-right:18px; white-space:nowrap;"><strong>${r.checked ? "X" : "___"}</strong> ${esc(r.label)}</span>`)
    .join(" ");
  const b = `<h1 style="text-align:center">CERTIFICATION OF EMERGENCY MEDICAL CONDITION</h1>
    <p><strong>PATIENT NAME:</strong> ${esc(form.patient.firstName)} ${esc(form.patient.lastName)}
       &nbsp;&nbsp;<strong>DATE OF SERVICE (DOS):</strong> ${esc(form.visitDate)}<br>
       <strong>DATE OF ACCIDENT (DOA):</strong> ${esc(form.accident.accidentDate)}</p>
    <h2>Diagnosis</h2>
    <table><tr><th>ICD-10 Code</th><th>Diagnosis</th><th>ICD-10 Code</th><th>Diagnosis</th></tr>${rows.join("")}</table>
    <p style="text-transform:uppercase; font-size:11px;"><strong>"Emergency Medical Condition" means a condition manifesting itself by acute symptoms of
    sufficient severity, which may include severe pain, such that the absence of immediate medical attention could reasonably
    be expected to result in any of the following:</strong></p>
    <p style="margin-left:20px; font-size:11px; text-transform:uppercase;">A. Serious jeopardy to patient health<br>B. Serious impairment to bodily functions<br>C. Serious dysfunction of any bodily organ or part</p>
    <p><strong>Physician Certification — Region(s):</strong> The patient has an Emergency Medical Condition documented in the region(s) marked below.</p>
    <p>${regions}</p>
    <h2>Physician Certification</h2>
    <p>I, ${esc(CLINIC.provider)}, evaluated the patient on the date of service. Based on the patient's history, reported accident
    mechanism, clinical presentation, examination findings, and my medical judgment, I certify that the patient has an Emergency
    Medical Condition as defined under Florida Statute § 627.736.</p>
    <p>This certification is based on clinical findings only. It is not based on reimbursement, referral source, therapy use, or case value.</p>
    <p>I certify that the above information is true and correct to the best of my medical judgment.</p>
    ${signature()}
    <p style="font-size:10px; color:#555; margin-top:30px;">${esc(CLINIC.name)} · ${esc(CLINIC.address)} · ${esc(CLINIC.phone)} · Fax: ${esc(CLINIC.fax)}.
    This document is confidential and intended solely for the named recipient and authorized parties. Unauthorized disclosure is prohibited.</p>`;
  return wrap(`EMC Certification — ${form.patient.lastName}`, b);
}

/** Per-encounter superbill: diagnoses with pointers + priced service lines. */
export function buildSuperbillHtml(form: VisitForm, lines: ServiceLine[], settings: BillingSettings, encounter: "md" | "pt"): string {
  const dx = allDiagnosisCodes(form).slice(0, 12);
  const letters = "ABCDEFGHIJKL";
  const dxRows = dx.map((d, i) => `<tr><td>${letters[i]}</td><td>${esc(d.code)}</td><td>${esc(d.desc)}</td></tr>`).join("");
  const pointers = letters.slice(0, Math.min(dx.length, 4));
  const lineRows = lines
    .map(
      (l) =>
        `<tr><td>${esc(form.visitDate)}</td><td>${l.pos}</td><td>${esc(l.cpt)}${l.modifier ? `-${l.modifier}` : ""}</td><td>${esc(l.description)}</td><td>${pointers}</td><td>${l.units}</td><td>${l.charge ? `$${esc(l.charge)}` : ""}</td></tr>`,
    )
    .join("");
  const total = totalCharges(lines);
  const b = `<h1>${encounter === "md" ? "ENCOUNTER SUPERBILL" : "PHYSICAL THERAPY SUPERBILL"}</h1>
    ${patientBlock(form)}
    <h2>Diagnoses (ICD-10)</h2>
    <table><tr><th>Ref</th><th>Code</th><th>Description</th></tr>${dxRows}</table>
    <h2>Services</h2>
    <table><tr><th>DOS</th><th>POS</th><th>CPT/Mod</th><th>Description</th><th>Dx Ptr</th><th>Units</th><th>Charge</th></tr>${lineRows}
    <tr><td colspan="6" style="text-align:right"><strong>Total</strong></td><td><strong>${total ? `$${total}` : ""}</strong></td></tr></table>
    <table style="margin-top:10px"><tr>
      <th>Federal Tax ID (EIN)</th><td>${esc(settings.ein)}</td>
      <th>Billing NPI</th><td>${esc(settings.billingNpi || settings.renderingNpi)}</td>
      <th>Rendering NPI</th><td>${esc(settings.renderingNpi)}</td>
    </tr></table>
    ${signature()}
    <div class="sig"><div class="sig-line">Patient Signature</div></div>`;
  return wrap(`Superbill — ${form.patient.lastName}`, b);
}

/** CMS-1500 (02/12) print replica, auto-populated. Box numbers shown for cross-reference. */
export function buildCms1500Html(form: VisitForm, lines: ServiceLine[], settings: BillingSettings): string {
  const p = form.patient;
  const dx = allDiagnosisCodes(form).slice(0, 12);
  const letters = "ABCDEFGHIJKL";
  const dxCells = dx.map((d, i) => `<td><strong>${letters[i]}.</strong> ${esc(d.code)}</td>`).join("");
  const pointers = letters.slice(0, Math.min(dx.length, 4));
  const lineRows = lines
    .map(
      (l) =>
        `<tr><td>${esc(form.visitDate)}</td><td>${l.pos}</td><td>${esc(l.cpt)}</td><td>${l.modifier}</td><td>${pointers}</td><td>${l.charge ? `$${esc(l.charge)}` : ""}</td><td>${l.units}</td><td>${esc(settings.renderingNpi)}</td></tr>`,
    )
    .join("");
  const total = totalCharges(lines);
  const sexBox = p.sex === "male" ? "M [X]  F [ ]" : p.sex === "female" ? "M [ ]  F [X]" : "M [ ]  F [ ]";
  const b = `<h1>HEALTH INSURANCE CLAIM FORM — CMS-1500 (02/12) DATA</h1>
    <p class="status" style="color:#555">Print replica for review/fax. For payer submission on preprinted red OCR forms, transfer values by box number.</p>
    <table>
      <tr><th>1. Type</th><td>OTHER [X] (Auto/PIP)</td><th>1a. Insured's ID / Policy</th><td>${esc(p.policyNumber)}</td></tr>
      <tr><th>2. Patient's Name</th><td>${esc(p.lastName)}, ${esc(p.firstName)}</td><th>3. DOB / Sex</th><td>${esc(p.dob)} — ${sexBox}</td></tr>
      <tr><th>4. Insured's Name</th><td>${esc(p.lastName)}, ${esc(p.firstName)} (Self)</td><th>6. Relationship</th><td>Self [X]</td></tr>
      <tr><th>5. Patient's Address</th><td colspan="3">${esc(p.address)}, ${esc(p.city)}, ${esc(p.state)} ${esc(p.zip)} — Tel: ${esc(p.phone)}</td></tr>
      <tr><th>10b. Auto Accident?</th><td>YES [X] — PLACE (State): FL</td><th>11. Insurance Plan</th><td>${esc(p.insuranceCarrier)}</td></tr>
      <tr><th>14. Date of Current Illness/Injury (Qual. 439)</th><td>${esc(form.accident.accidentDate)}</td><th>21. ICD Ind.</th><td>0 (ICD-10-CM)</td></tr>
    </table>
    <h2>21. Diagnosis Codes</h2>
    <table><tr>${dxCells}</tr></table>
    <h2>24. Service Lines</h2>
    <table><tr><th>A. DOS</th><th>B. POS</th><th>D. CPT</th><th>Mod</th><th>E. Dx Ptr</th><th>F. Charges</th><th>G. Units</th><th>J. Rendering NPI</th></tr>${lineRows}</table>
    <table style="margin-top:10px">
      <tr><th>25. Federal Tax ID</th><td>${esc(settings.ein)}</td><th>28. Total Charge</th><td>${total ? `$${total}` : ""}</td></tr>
      <tr><th>31. Signature of Physician</th><td>${esc(CLINIC.provider)} — ${esc(form.visitDate)}</td><th>32. Service Facility</th><td>${esc(CLINIC.name)}, ${esc(CLINIC.address)}</td></tr>
      <tr><th>33. Billing Provider</th><td>${esc(CLINIC.name)}, ${esc(CLINIC.address)} — ${esc(CLINIC.phone)}</td><th>33a. NPI</th><td>${esc(settings.billingNpi || settings.renderingNpi)}</td></tr>
    </table>`;
  return wrap(`CMS-1500 — ${form.patient.lastName}`, b);
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
