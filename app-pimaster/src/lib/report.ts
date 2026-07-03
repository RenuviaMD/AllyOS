import { totalCharges, type BillingSettings, type ServiceLine } from "./billing";
import { CLINIC } from "./clinic";
import { imagingDestination, loadImagingConfig } from "./imaging";
import { EM_LEVELS, PROCEDURES, PT_MODALITIES, resolveImagingSelection } from "./cpt";
import { deriveIcd10, parseManualCodes, PSYCH_CODES, withEncounter } from "./icd10";
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
  const suppressed = form.assessment.suppressedCodes ?? [];
  const derived = deriveIcd10(form).filter((d) => !suppressed.includes(d.code));
  const auto = form.assessment.autoCodes.length ? form.assessment.autoCodes : derived;
  const extra = form.assessment.extraCodes ?? [];
  const psych = PSYCH_CODES.filter((p) => form.assessment.psych.includes(p.code));
  const manual = parseManualCodes(form.assessment.manual);
  const seen = new Set<string>();
  return [...auto, ...extra, ...psych, ...manual]
    .map((d) => withEncounter(d, form.visitType))
    .filter((d) => (seen.has(d.code) ? false : (seen.add(d.code), true)));
}

/** CPT codes actually billed for a chart. PT charts bill the treatments provided,
 * not the physician's planned modalities. */
export function allCptCodes(form: VisitForm, mode?: string): string[] {
  if (mode === "ptdaily") return [...new Set(form.ptDaily?.treatments ?? [])];
  if (mode === "ptprogress") return [];
  const out: string[] = [];
  if (form.plan.emLevel) out.push(form.plan.emLevel);
  out.push(...(form.plan.procedures ?? []));
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
  const procedures = pl.procedures ?? [];
  if (pl.emLevel || pl.medicalNecessity || pl.modalities.length || procedures.length) {
    const em = EM_LEVELS.find((e) => e.code === pl.emLevel)?.label ?? pl.emLevel;
    b += `<h2>Plan of Treatment</h2>`;
    if (em) b += `<p><strong>E/M Level:</strong> ${esc(em)}</p>`;
    if (pl.medicalNecessity) b += `<p><strong>Medical Necessity:</strong> ${esc(pl.medicalNecessity)}</p>`;
    if (procedures.length) {
      const procs = PROCEDURES.filter((p) => procedures.includes(p.cpt));
      b += `<p><strong>Procedures performed this visit:</strong></p><table><tr><th>CPT</th><th>Procedure</th></tr>${procs
        .map((p) => `<tr><td>${p.cpt}</td><td>${esc(p.name)}</td></tr>`)
        .join("")}</table>`;
      if (pl.procedureNote) b += `<p class="narrative">${esc(pl.procedureNote)}</p>`;
    }
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
  const carrierLine = [form.patient.insuranceCarrier, form.patient.insurerAddress, form.patient.insurerPhone ? `Tel: ${form.patient.insurerPhone}` : ""].filter((s): s is string => !!s).map(esc).join(" — ");
  const b = `<h1>${encounter === "md" ? "ENCOUNTER SUPERBILL" : "PHYSICAL THERAPY SUPERBILL"}</h1>
    ${patientBlock(form)}
    ${carrierLine ? `<table><tr><th>Submit claim to</th><td>${carrierLine}</td></tr></table>` : ""}
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
  const carrierLine = [p.insuranceCarrier, p.insurerAddress, p.insurerPhone ? `Tel: ${p.insurerPhone}` : ""].filter((s): s is string => !!s).map(esc).join(" — ");
  const b = `<h1>HEALTH INSURANCE CLAIM FORM — CMS-1500 (02/12) DATA</h1>
    <p class="status" style="color:#555">Print replica for review/fax. For payer submission on preprinted red OCR forms, transfer values by box number.</p>
    ${carrierLine ? `<table><tr><th>Submit claim to (carrier)</th><td colspan="3">${carrierLine}</td></tr></table>` : ""}
    <table>
      <tr><th>1. Type</th><td>OTHER [X] (Auto/PIP)</td><th>1a. Insured's ID / Policy</th><td>${esc(p.policyNumber)}</td></tr>
      <tr><th>2. Patient's Name</th><td>${esc(p.lastName)}, ${esc(p.firstName)}</td><th>3. DOB / Sex</th><td>${esc(p.dob)} — ${sexBox}</td></tr>
      <tr><th>4. Insured's Name</th><td>${esc(p.lastName)}, ${esc(p.firstName)} (Self)</td><th>6. Relationship</th><td>Self [X]</td></tr>
      <tr><th>5. Patient's Address</th><td colspan="3">${esc(p.address)}, ${esc(p.city)}, ${esc(p.state)} ${esc(p.zip)} — Tel: ${esc(p.phone)}</td></tr>
      <tr><th>10b. Auto Accident?</th><td>YES [X] — PLACE (State): FL</td><th>11. Insurance Plan / Payer ID</th><td>${esc(p.insuranceCarrier)}${p.insurerPayerId ? ` — ${esc(p.insurerPayerId)}` : ""}</td></tr>
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

/** Imaging order on clinic letterhead — addressed to the clinic's configured
 * third-party diagnostic center, or marked performed on-site. */
export function buildXrayOrderHtml(form: VisitForm): string {
  const dx = allDiagnosisCodes(form);
  const dest = imagingDestination(loadImagingConfig());
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
    <p><strong>${esc(dest.heading)}:</strong> ${esc(dest.name)}<br>${esc(dest.address)}<br>
    Phone: ${esc(dest.phone)} | Fax: ${esc(dest.fax)}</p>
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

/* ---------------------------------------------------------------------------
 * Visit package documents. Every form prints PRE-FILLED from entered data —
 * no handwritten patient fields. Only signatures (and the notary block on the
 * affidavit) are completed on paper.
 * ------------------------------------------------------------------------- */

function fullName(form: VisitForm): string {
  return `${form.patient.firstName} ${form.patient.lastName}`.trim();
}

function packageIdentityBlock(form: VisitForm): string {
  const p = form.patient;
  const addr = [p.address, [p.city, p.state, p.zip].filter(Boolean).join(", ")].filter(Boolean).join(", ");
  return `<table>
    <tr><th>Patient</th><td>${esc(fullName(form))}</td><th>Date of Birth</th><td>${esc(p.dob)}</td></tr>
    <tr><th>Address</th><td>${esc(addr)}</td><th>Phone</th><td>${esc(p.phone)}</td></tr>
    <tr><th>Insurance Carrier</th><td>${esc(p.insuranceCarrier)}</td><th>Policy #</th><td>${esc(p.policyNumber)}</td></tr>
    <tr><th>Date of Accident</th><td>${esc(form.accident.accidentDate)}</td><th>Date</th><td>${esc(form.visitDate)}</td></tr>
  </table>`;
}

function patientSignatureLines(form: VisitForm, witnessLabel = "Witness (clinic staff)"): string {
  return `<div class="sig"><div class="sig-line">Signature of ${esc(fullName(form))} &nbsp;&nbsp;·&nbsp;&nbsp; Date</div></div>
    <div class="sig"><div class="sig-line">${esc(witnessLabel)} &nbsp;&nbsp;·&nbsp;&nbsp; Date</div></div>`;
}

/** Assignment of Benefits — patient signs once at the first visit. */
export function buildAobHtml(form: VisitForm): string {
  const b = `<h1>ASSIGNMENT OF BENEFITS &amp; DIRECT PAYMENT AUTHORIZATION</h1>
    ${packageIdentityBlock(form)}
    <p>I, <strong>${esc(fullName(form))}</strong>, hereby assign to <strong>${esc(CLINIC.name)}</strong> all rights and
    benefits under any policy of insurance providing coverage for the treatment of injuries I sustained in the accident
    of <strong>${esc(form.accident.accidentDate)}</strong>, including Personal Injury Protection (PIP) benefits under
    Florida Statute § 627.736 and any applicable medical payments coverage.</p>
    <p>I authorize and direct my insurance carrier${form.patient.insuranceCarrier ? `, <strong>${esc(form.patient.insuranceCarrier)}</strong>,` : ""}
    to pay ${esc(CLINIC.name)} directly for services rendered to me. I understand that I remain personally responsible
    for any charges not covered by this assignment to the extent permitted by law. This assignment remains in effect
    for the duration of my treatment unless revoked by me in writing.</p>
    <p>I acknowledge receipt of the clinic's notice of privacy practices and consent to treatment.</p>
    ${patientSignatureLines(form)}`;
  return wrap(`Assignment of Benefits — ${form.patient.lastName}`, b);
}

/** HIPAA medical records release — patient signs once at the first visit. */
export function buildRecordsReleaseHtml(form: VisitForm): string {
  const b = `<h1>AUTHORIZATION FOR RELEASE OF MEDICAL RECORDS (HIPAA)</h1>
    ${packageIdentityBlock(form)}
    <p>I, <strong>${esc(fullName(form))}</strong>, authorize <strong>${esc(CLINIC.name)}</strong> to release my complete
    medical records, reports, imaging results, and billing records relating to treatment of injuries sustained in the
    accident of <strong>${esc(form.accident.accidentDate)}</strong> to: my insurance carrier and its representatives,
    my designated attorney and their staff, and any physician or facility participating in my care.</p>
    <p>This authorization is made pursuant to 45 CFR § 164.508. It expires one (1) year from the date signed or upon my
    written revocation, whichever occurs first. I understand I may revoke this authorization at any time in writing,
    except to the extent that action has already been taken in reliance on it, and that treatment is not conditioned on
    signing this authorization. A photocopy of this authorization is as valid as the original.</p>
    ${patientSignatureLines(form)}`;
  return wrap(`Records Release — ${form.patient.lastName}`, b);
}

/** FL PIP 14-day initial-services attestation — patient signs once at the first visit. */
export function buildAttestation14Html(form: VisitForm): string {
  const b = `<h1>PIP 14-DAY INITIAL SERVICES ATTESTATION</h1>
    ${packageIdentityBlock(form)}
    <p>Florida Statute § 627.736(1)(a) requires that a person injured in a motor vehicle accident receive initial
    services and care within <strong>14 days</strong> after the accident for Personal Injury Protection benefits to apply.</p>
    <p>I, <strong>${esc(fullName(form))}</strong>, attest that I was involved in a motor vehicle accident on
    <strong>${esc(form.accident.accidentDate)}</strong> and that I sought initial medical services and care for the
    injuries I sustained, presenting to <strong>${esc(CLINIC.name)}</strong> on <strong>${esc(form.visitDate)}</strong>.
    I attest that the information I have provided regarding the accident and my injuries is true and correct to the
    best of my knowledge.</p>
    ${patientSignatureLines(form)}`;
  return wrap(`14-Day Attestation — ${form.patient.lastName}`, b);
}

/** Telehealth consent — signed for telehealth visits (facility-originated). */
export function buildTelehealthConsentHtml(form: VisitForm): string {
  const t = form.telehealth;
  const b = `<h1>TELEHEALTH INFORMED CONSENT (FACILITY-ORIGINATED)</h1>
    ${packageIdentityBlock(form)}
    <p>I, <strong>${esc(fullName(form))}</strong>, consent to receive evaluation and care by telehealth. I understand:</p>
    <table>
      <tr><td>1</td><td>I am physically present at <strong>${esc(CLINIC.name)}, ${esc(CLINIC.address)}</strong> (the originating site), attended by clinic staff, and the provider evaluates me from a remote location by secure, real-time audio-video connection.</td></tr>
      <tr><td>2</td><td>Vital signs and any measurements are taken by on-site clinic staff. The remote provider's examination is limited to what can be observed and directed over video; no hands-on findings are recorded.</td></tr>
      <tr><td>3</td><td>I may decline or stop the telehealth encounter at any time and request an in-person visit without affecting my right to care.</td></tr>
      <tr><td>4</td><td>Technical failures may interrupt the encounter; if the connection cannot be restored, the visit will be rescheduled or converted to in-person.</td></tr>
      <tr><td>5</td><td>The encounter is documented in my medical record like any other visit and is protected by the same privacy laws.</td></tr>
    </table>
    ${t.consentBy ? `<p>Consent discussed and witnessed by clinic staff: <strong>${esc(t.consentBy)}</strong>.</p>` : ""}
    ${patientSignatureLines(form, t.consentBy ? `${t.consentBy} — clinic staff (originating site)` : "Clinic staff (originating site)")}`;
  return wrap(`Telehealth Consent — ${form.patient.lastName}`, b);
}

/** Physician sworn affidavit — generated ONCE per patient, at the first visit. */
export function buildAffidavitHtml(form: VisitForm): string {
  const b = `<h1>SWORN AFFIDAVIT OF ATTENDING PHYSICIAN</h1>
    <p>STATE OF FLORIDA<br>COUNTY OF MIAMI-DADE</p>
    <p>BEFORE ME, the undersigned authority, personally appeared <strong>${esc(CLINIC.provider)}</strong>, who after
    being duly sworn, deposes and states:</p>
    <table>
      <tr><td>1</td><td>I am a physician licensed to practice in the State of Florida (License ${esc(CLINIC.license)}, NPI ${esc(CLINIC.npi)}), practicing at ${esc(CLINIC.name)}, ${esc(CLINIC.address)}.</td></tr>
      <tr><td>2</td><td>I am the attending physician for <strong>${esc(fullName(form))}</strong> (DOB ${esc(form.patient.dob)}), who presented for evaluation and treatment of injuries sustained in a motor vehicle accident on <strong>${esc(form.accident.accidentDate)}</strong>, with care at this clinic beginning <strong>${esc(form.visitDate)}</strong>.</td></tr>
      <tr><td>3</td><td>The evaluation, treatment, and services rendered and prescribed by me for this patient are, in my professional medical opinion, reasonable, related to the accident described, and medically necessary.</td></tr>
      <tr><td>4</td><td>The medical records and billing records produced by this office for this patient are true and accurate records made at or near the time of the events they describe, kept in the ordinary course of the practice's regularly conducted business activity.</td></tr>
    </table>
    <p>FURTHER AFFIANT SAYETH NAUGHT.</p>
    ${signature()}
    <p style="margin-top:36px">SWORN TO AND SUBSCRIBED before me this ____ day of ______________, 20____, by
    ${esc(CLINIC.provider)}, who is personally known to me or produced identification: ______________________.</p>
    <div class="sig"><div class="sig-line">Notary Public, State of Florida &nbsp;&nbsp;·&nbsp;&nbsp; Commission No. / Expiration</div></div>`;
  return wrap(`Sworn Affidavit — ${form.patient.lastName}`, b);
}

/** Strip active content from HTML before rendering. Our own builders escape all
 * interpolation, but stored report_html can include legacy rows written by the
 * previous app — neutralize scripts/handlers to prevent stored-XSS. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|link|meta|base)\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"');
}

/** Open a print window for the generated HTML (print → Save as PDF).
 * Popup blockers (default on iPad Safari) silently kill window.open —
 * surface that instead of failing quietly. Returns false when blocked. */
export function printHtml(rawHtml: string): boolean {
  const html = sanitizeHtml(rawHtml);
  const w = window.open("", "_blank", "noopener=no");
  if (!w) {
    const note = document.createElement("div");
    note.className = "popup-note";
    note.textContent = "The document window was blocked. Allow pop-ups for this site, then click the button again.";
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 7000);
    return false;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/** The stored signed report, or a freshly built note from the saved form data. */
export async function getReportHtmlOrBuild(id: string, form: VisitForm): Promise<string> {
  const { getReportHtml } = await import("./store");
  const stored = await getReportHtml(id);
  return stored ?? buildClinicalNoteHtml(form);
}

/** Trigger a client-side file download (used for the AHCA Pro encounter CSV). */
export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
