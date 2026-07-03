import { totalCharges, type BillingSettings, type ServiceLine } from "./billing";
import { CLINIC } from "./clinic";
import { imagingDestination, loadImagingConfig } from "./imaging";
import { PROCEDURES, PT_MODALITIES, resolveImagingSelection } from "./cpt";
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
import { EXAM_REGIONS, impairedSides, JOINT_REGIONS, SPINE_REGION_IDS, SPINE_REGION_LABELS } from "./rom";
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
    <div class="lh-line">${esc(CLINIC.address)}</div>
    <div class="lh-line">Phone: ${esc(CLINIC.phone)} &nbsp;·&nbsp; Fax: ${esc(CLINIC.fax)}</div>
    <div class="lh-line lh-provider">${esc(CLINIC.provider)} &nbsp;—&nbsp; License ${esc(CLINIC.license)} &nbsp;—&nbsp; NPI ${esc(CLINIC.npi)}</div>
  </div>`;

const REPORT_CSS = `
  * { box-sizing: border-box; }
  html { background: #e8ecef; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1c2833; margin: 0; font-size: 12.5px; line-height: 1.5; }
  .sheet { max-width: 8.5in; margin: 26px auto; background: #fff; padding: 0.65in 0.7in 0.55in; box-shadow: 0 3px 18px rgba(15,35,55,.16); }
  .letterhead { text-align: center; padding-bottom: 12px; margin-bottom: 20px; border-bottom: 2.5px solid #16a085; }
  .letterhead { box-shadow: 0 4px 0 -3px #b8860b; }
  .lh-name { font-size: 21px; font-weight: 700; letter-spacing: 2.5px; color: #22313f; text-transform: uppercase; }
  .lh-line { font-size: 11px; color: #4c5a66; letter-spacing: .4px; margin-top: 2px; }
  .lh-provider { font-variant: small-caps; letter-spacing: 1px; }
  h1 { font-size: 15px; letter-spacing: 1.4px; text-transform: uppercase; color: #22313f; margin: 2px 0 14px; padding: 7px 12px; background: #f2f5f7; border-left: 4px solid #b8860b; font-weight: 700; }
  h2 { font-size: 11px; color: #10715f; text-transform: uppercase; letter-spacing: 1.6px; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #ccd6dd; font-weight: 700; }
  p { margin: 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
  td, th { border: 1px solid #ccd6dd; padding: 5px 9px; text-align: left; vertical-align: top; }
  th { background: #f2f5f7; font-weight: 700; color: #33424f; font-size: 10.5px; letter-spacing: .5px; text-transform: uppercase; }
  .narrative { font-style: italic; color: #24313d; }
  ol.num-list { margin: 6px 0 10px 22px; padding: 0; }
  ol.num-list li { margin: 4px 0; }
  .sig { margin-top: 42px; }
  .sig-line { border-top: 1px solid #1c2833; width: 330px; padding-top: 5px; font-size: 11.5px; }
  .status { color: #667; }
  .doc-footer { text-align: center; font-family: "Segoe UI", Arial, sans-serif; font-size: 8.5pt; color: #5b6a76; border-top: 1px solid #ccd6dd; padding: 5px 0 2px; background: #fff; max-width: 8.5in; margin: 0 auto 26px; }
  .doc-footer .ftr-brand { letter-spacing: .7px; font-weight: 600; }
  .doc-footer .ftr-ctx { font-size: 7.8pt; color: #74828d; }
  @media print {
    html, body { background: #fff; }
    .sheet { box-shadow: none; margin: 0; padding: 0 0 0.55in; max-width: none; }
    /* fixed elements repeat on every printed page — the footer prints on each */
    .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; max-width: none; margin: 0; }
    @page { margin: 0.5in 0.55in 0.75in; }
  }
`;

/** Repeats at the foot of every printed page: product brand + claim context. */
function docFooter(ctx = ""): string {
  return `<div class="doc-footer"><span class="ftr-brand">PI Master™ — PIP Documentation &amp; Compliance &nbsp;·&nbsp; Powered by RenuviaMD® Network</span>${
    ctx ? `<br><span class="ftr-ctx">${ctx}</span>` : ""
  }</div>`;
}

/** Patient/claim context line for the running footer — carriers want the claim number on every page. */
function footerCtx(form: VisitForm): string {
  const p = form.patient;
  const name = `${p.firstName} ${p.lastName}`.trim();
  return [name ? `Patient: ${name}` : "", p.dob ? `DOB: ${p.dob}` : "", p.claimNumber ? `Claim #: ${p.claimNumber}` : "", form.visitDate ? `DOS: ${form.visitDate}` : ""]
    .filter(Boolean)
    .map(esc)
    .join(" · ");
}

function wrap(title: string, body: string, ctx = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${REPORT_CSS}</style></head><body><div class="sheet">${LETTERHEAD}${body}</div>${docFooter(ctx)}</body></html>`;
}

function patientBlock(form: VisitForm): string {
  const p = form.patient;
  return `<table>
    <tr><th>Patient</th><td>${esc(p.firstName)} ${esc(p.lastName)}</td><th>DOB</th><td>${esc(p.dob)}</td></tr>
    <tr><th>Sex</th><td>${esc(p.sex)}</td><th>Visit Date</th><td>${esc(form.visitDate)}</td></tr>
    <tr><th>Insurance</th><td>${esc(p.insuranceCarrier)}</td><th>Policy # / Claim #</th><td>${esc(p.policyNumber)}${p.claimNumber ? ` / ${esc(p.claimNumber)}` : ""}</td></tr>
    <tr><th>Accident Date</th><td>${esc(form.accident.accidentDate)}</td><th>Visit Type</th><td>${esc(form.visitType.toUpperCase())} — ${form.visitMode === "telehealth" ? "TELEHEALTH (facility-originated)" : "IN PERSON"}</td></tr>
  </table>`;
}

function signature(): string {
  return `<div class="sig"><div class="sig-line">${esc(CLINIC.provider)}<br>License ${esc(CLINIC.license)} | NPI ${esc(CLINIC.npi)}</div></div>`;
}

/* ---- narrative helpers for the clinical note (MD notes are prose, not tables) ---- */

const GRADE_PROSE: Record<string, string> = { wnl: "within normal limits", limited: "limited", cannot: "cannot be performed" };

function pmhNarrative(form: VisitForm): string {
  const m = form.pmh;
  const s: string[] = [];
  const conditions = [m.hypertension === "yes" ? "hypertension" : "", m.diabetes === "yes" ? "diabetes" : "", m.heartDisease === "yes" ? "heart disease" : ""].filter(Boolean);
  const denied = [m.hypertension === "no" ? "hypertension" : "", m.diabetes === "no" ? "diabetes" : "", m.heartDisease === "no" ? "heart disease" : ""].filter(Boolean);
  if (conditions.length) s.push(`Past medical history is notable for ${conditions.join(", ")}.`);
  if (denied.length) s.push(`The patient denies ${denied.join(", ")}.`);
  if (m.medications === "yes") s.push("The patient reports current medication use.");
  if (m.medications === "no") s.push("The patient takes no medications.");
  if (m.allergies === "yes") s.push("Allergies are reported.");
  if (m.allergies === "no") s.push("No known allergies.");
  if (m.surgeries === "yes") s.push("There is a history of prior surgery.");
  if (m.surgeries === "no") s.push("No prior surgical history.");
  if (m.previousAccidents === "yes") s.push("The patient reports prior accidents.");
  if (m.previousAccidents === "no") s.push("No prior accidents are reported.");
  const social = [m.smoking === "no" ? "tobacco" : "", m.alcohol === "no" ? "alcohol" : "", m.drugs === "no" ? "recreational drug use" : ""].filter(Boolean);
  const socialYes = [m.smoking === "yes" ? "tobacco use" : "", m.alcohol === "yes" ? "alcohol use" : "", m.drugs === "yes" ? "recreational drug use" : ""].filter(Boolean);
  if (socialYes.length) s.push(`Social history is positive for ${socialYes.join(", ")}.`);
  if (social.length) s.push(`The patient denies ${social.join(", ")}.`);
  if (m.pregnant === "yes") s.push(`The patient is pregnant${m.lmp ? ` (LMP ${m.lmp})` : ""}.`);
  if (m.pregnant === "no" && m.lmp) s.push(`LMP: ${m.lmp}.`);
  return s.join(" ");
}

function examNarrative(form: VisitForm): string {
  const inPerson = form.visitMode === "inPerson";
  const g = form.gen;
  const paras: string[] = [];

  const vit = [g.bp ? `BP ${g.bp}` : "", g.pulse ? `pulse ${g.pulse}` : "", g.resp ? `respirations ${g.resp}` : "", g.temp ? `temperature ${g.temp}` : ""].filter(Boolean);
  if (vit.length) {
    const by = form.visitMode === "telehealth" ? " (obtained by on-site clinic staff)" : "";
    paras.push(`<p><strong>Vital signs${by}:</strong> ${esc(vit.join(", "))}.</p>`);
  }
  const gen = [g.appearance ? `${g.appearance}` : "", g.posture ? `Posture: ${g.posture.toLowerCase()}` : "", g.mood ? `Mood/affect: ${g.mood.toLowerCase()}` : "", g.cognition ? `Cognition: ${g.cognition.toLowerCase()}` : ""].filter(Boolean);
  if (gen.length) paras.push(`<p><strong>General:</strong> ${esc(gen.join(". "))}.</p>`);

  for (const id of SPINE_REGION_IDS) {
    const row = form.spineExam[id];
    if (!row || (!row.tenderness && !row.spasm && !row.rom)) continue;
    const bits: string[] = [];
    if (inPerson) {
      if (row.tenderness) bits.push(`tenderness to palpation ${row.tenderness === "yes" ? "present" : "absent"}`);
      if (row.spasm) bits.push(`paravertebral muscle spasm ${row.spasm === "yes" ? "present" : "absent"}`);
    }
    if (row.rom) bits.push(`range of motion ${GRADE_PROSE[row.rom] ?? row.rom}`);
    if (!inPerson) bits.push("hands-on palpation not performed (telehealth encounter)");
    if (bits.length) paras.push(`<p><strong>${SPINE_REGION_LABELS[id]} spine:</strong> ${esc(bits.join("; "))}.</p>`);
  }

  // Functional maneuvers as prose per region — normal values are reference
  // ranges only, cited parenthetically for impaired maneuvers.
  for (const region of EXAM_REGIONS) {
    const phrases: string[] = [];
    for (const mv of region.maneuvers) {
      const grade = form.romExam[mv.id];
      if (!grade) continue;
      const ref = grade !== "wnl" ? ` (normal ${mv.normalLabel})` : "";
      phrases.push(`${mv.label.toLowerCase()} ${GRADE_PROSE[grade] ?? grade}${ref}`);
    }
    if (phrases.length) {
      const observed = form.visitMode === "telehealth" ? " (observed via synchronous audio-video)" : "";
      paras.push(`<p><strong>${esc(region.label)} — functional examination${observed}:</strong> ${esc(phrases.join("; "))}.</p>`);
    }
  }

  if (inPerson) {
    const joints: string[] = [];
    for (const r of JOINT_REGIONS) {
      const t = form.jointTenderness[r.id];
      if (!t || (!t.R && !t.L)) continue;
      const sides = [t.R ? `right ${t.R === "yes" ? "tender" : "non-tender"}` : "", t.L ? `left ${t.L === "yes" ? "tender" : "non-tender"}` : ""].filter(Boolean);
      joints.push(`${r.label.toLowerCase()} ${sides.join(", ")}`);
    }
    if (joints.length) paras.push(`<p><strong>Joint examination:</strong> ${esc(joints.join("; "))}.</p>`);
  }
  return paras.join("");
}

/** Substitute the AI report's PHI placeholders with the real identifiers at
 * print time (they never travel to the model), and strip the review-only
 * missing-items block from the printed document. */
export function finalizeAiReport(html: string, form: VisitForm): string {
  const name = `${form.patient.firstName} ${form.patient.lastName}`.trim();
  return html
    .replace(/\[PATIENT_NAME\]/g, esc(name))
    .replace(/\[PATIENT_DOB\]/g, esc(form.patient.dob))
    .replace(/<div class="draft-gaps">[\s\S]*?<\/div>/g, "");
}

/** Full clinical note (physician visit) — narrative MD format: prose sections,
 * numbered diagnoses and plan. Billing detail (E/M level, CPT tables) lives on
 * the superbill/CMS-1500, and the EMC certification is its own document — the
 * note carries only the physician's one-line determination.
 * When the physician has generated and approved an AI Initial Evaluation
 * Report (per the locked generation specs), that reviewed document IS the
 * note — it prints inside the clinic skeleton with its own required sections
 * (including the certification/signature block per the spec). */
export function buildClinicalNoteHtml(form: VisitForm): string {
  const reportDraft = (form.ai?.reportDraft ?? "").trim();
  if (reportDraft) {
    const body = sanitizeHtml(finalizeAiReport(reportDraft, form));
    return wrap(`Clinical Note — ${form.patient.lastName}`, body + signature(), footerCtx(form));
  }

  const titles = { initial: "INITIAL EVALUATION", followup: "FOLLOW-UP EVALUATION", final: "FINAL EVALUATION / DISCHARGE" };
  let b = `<h1>${titles[form.visitType]}</h1>${patientBlock(form)}`;

  if (form.visitMode === "telehealth") {
    b += `<h2>Telehealth Encounter Statement</h2><p class="narrative">${esc(telehealthStatement(form.telehealth))}</p>`;
  }

  // Physician-reviewed AI draft takes precedence over the rule-based narrative.
  const narr = (form.ai?.hpiDraft ?? "").trim() || injuryNarrative(form.patient, form.accident, { visitDate: form.visitDate, visitType: form.visitType });
  if (narr) b += `<h2>History of Present Illness</h2><p class="narrative">${esc(narr)}</p>`;

  const pmh = pmhNarrative(form);
  const agg = aggravationNarrative(form.pmh, form.accident.accidentType);
  if (pmh || agg) {
    b += `<h2>Past Medical History</h2>`;
    if (pmh) b += `<p>${esc(pmh)}</p>`;
    if (agg) b += `<p class="narrative">${esc(agg)}</p>`;
  }

  const exam = examNarrative(form);
  if (exam) b += `<h2>Physical Examination</h2>${exam}`;

  if (form.visitType === "followup") {
    const rev = imagingReviewNarrative(form.imagingReview);
    if (rev) b += `<h2>Imaging Review</h2><p class="narrative">${esc(rev)}</p>`;
  }

  const dx = allDiagnosisCodes(form);
  if (dx.length) {
    b += `<h2>Assessment</h2><ol class="num-list">${dx.map((d) => `<li>${esc(d.desc)} (${esc(d.code)})</li>`).join("")}</ol>`;
  }

  const pl = form.plan;
  const procedures = pl.procedures ?? [];
  const planItems: string[] = [];
  if (procedures.length) {
    const procs = PROCEDURES.filter((p) => procedures.includes(p.cpt))
      .map((p) => `${p.name.toLowerCase()} (${p.cpt})`)
      .join("; ");
    planItems.push(`Performed this visit: ${procs}.${pl.procedureNote ? ` ${pl.procedureNote}` : ""}`);
  }
  if (pl.modalities.length) {
    const mods = PT_MODALITIES.filter((m) => pl.modalities.includes(m.cpt))
      .map((m) => `${m.name.toLowerCase()} (${m.cpt})`)
      .join(", ");
    planItems.push(`Physical therapy ${pl.ptFrequency} for ${pl.ptDuration}: ${mods}.`);
  }
  const imagingOrdered: string[] = form.imaging.selected
    .map((sel) => {
      const r = resolveImagingSelection(sel);
      return r ? `${r.item.label}${r.side ? ` (${r.side === "R" ? "right" : "left"})` : ""}` : "";
    })
    .filter(Boolean);
  if (form.imaging.mriRegion) imagingOrdered.push(`MRI ${form.imaging.mriRegion}`);
  if (form.imaging.ctRegion) imagingOrdered.push(`CT ${form.imaging.ctRegion}`);
  if (form.imaging.usRegion) imagingOrdered.push(`ultrasound ${form.imaging.usRegion}`);
  if (imagingOrdered.length) planItems.push(`Diagnostic imaging ordered: ${imagingOrdered.join(", ")}.`);
  if (pl.followUp) planItems.push(`Follow-up evaluation in ${pl.followUp}.`);
  if (form.visitType === "initial" && pl.emc) {
    const emcLine = {
      yes: "The patient has an Emergency Medical Condition as defined under Fla. Stat. § 627.736; a separate Certification of Emergency Medical Condition has been issued.",
      no: "No Emergency Medical Condition was identified on today's evaluation.",
      deferred: "Emergency Medical Condition determination is deferred pending further evaluation and diagnostic correlation.",
    }[pl.emc];
    planItems.push(emcLine);
  }
  if (planItems.length || pl.medicalNecessity) {
    b += `<h2>Plan</h2>`;
    if (planItems.length) b += `<ol class="num-list">${planItems.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    if (pl.medicalNecessity) b += `<p class="narrative">${esc(pl.medicalNecessity)}</p>`;
  }

  const caus = causationStatement(form.plan.causation, form.accident.accidentDate, form.accident.accidentType);
  if (caus) b += `<h2>Causation Statement</h2><p class="narrative">${esc(caus)}</p>`;
  const prog = prognosisStatement(form.plan.prognosis);
  if (prog) b += `<h2>Prognosis</h2><p class="narrative">${esc(prog)}</p>`;

  if (form.visitType === "final") {
    const d = form.discharge;
    const parts = [
      d.outcome ? `The patient is discharged with ${d.outcome.toLowerCase()} overall outcome.` : "",
      d.returnToWork ? `Return to work: ${d.returnToWork.toLowerCase()}.` : "",
      d.returnToActivities ? `Return to activities: ${d.returnToActivities.toLowerCase()}.` : "",
      d.residualIssues === "yes" ? `Residual issues: ${d.residualNote}.` : d.residualIssues === "no" ? "No residual issues are documented." : "",
      d.sequelae ? `Apparent sequelae: ${d.sequelae}.` : "",
      d.continuedCare === "yes" ? `Continued care: ${d.continuedCareNote}.` : d.continuedCare === "no" ? "No continued care is required." : "",
    ].filter(Boolean);
    b += `<h2>Discharge Summary</h2><p>${esc(parts.join(" "))}</p><p><strong>Case status: CLOSED.</strong></p>`;
  }

  b += `<h2>Physician Certification</h2><p>${esc(certificationStatement())}</p>`;

  return wrap(`Clinical Note — ${form.patient.lastName}`, b + signature(), footerCtx(form));
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
  return wrap(`EMC Certification — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`Superbill — ${form.patient.lastName}`, b, footerCtx(form));
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
      <tr><th>10b. Auto Accident?</th><td>YES [X] — PLACE (State): FL</td><th>11. Insurance Plan / Payer ID</th><td>${esc(p.insuranceCarrier)}${p.insurerPayerId ? ` — ${esc(p.insurerPayerId)}` : ""}${p.claimNumber ? ` — Claim #: ${esc(p.claimNumber)}` : ""}</td></tr>
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
  return wrap(`CMS-1500 — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`X-Ray Order — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`PT Note — ${form.patient.lastName}`, b + signature(), footerCtx(form));
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
  return wrap(`Assignment of Benefits — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`Records Release — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`14-Day Attestation — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`Telehealth Consent — ${form.patient.lastName}`, b, footerCtx(form));
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
  return wrap(`Sworn Affidavit — ${form.patient.lastName}`, b, footerCtx(form));
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
