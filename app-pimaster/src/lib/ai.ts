import { supabase } from "./store";
import type { VisitForm } from "./types";

/**
 * AI-drafted HPI. PHI-minimized by design: the payload carries initials and
 * structured clinical facts only — never names, DOB, address, phone, or
 * policy/claim numbers. The server-side Edge Function strips identifiers
 * again as a hard guard and holds the API key; nothing sensitive ships in
 * the browser bundle. The draft is a physician aid: it is reviewed and
 * editable before it ever prints on a note.
 */

function ageOn(dob: string, onDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(onDate) ? new Date(onDate + "T00:00:00Z") : new Date();
  const b = new Date(dob + "T00:00:00Z");
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  if (ref.getUTCMonth() < b.getUTCMonth() || (ref.getUTCMonth() === b.getUTCMonth() && ref.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/** Structured, de-identified facts for the narrative model. */
export function narrativeFacts(form: VisitForm): Record<string, unknown> {
  const p = form.patient;
  const initials = `${p.firstName.trim().charAt(0)}${p.lastName.trim().charAt(0)}`.toUpperCase();
  return {
    patientInitials: initials || undefined,
    age: ageOn(p.dob, form.visitDate) ?? undefined,
    sex: p.sex || undefined,
    visitType: form.visitType,
    visitMode: form.visitMode,
    accident: {
      date: form.accident.accidentDate || undefined,
      type: form.accident.accidentType || undefined,
      role: form.accident.role || undefined,
      seatbelt: form.accident.seatbelt || undefined,
      airbag: form.accident.airbag || undefined,
      vehicleDrivable: form.accident.vehicleDrivable || undefined,
      ticketed: form.accident.ticketed || undefined,
      priorMedicalCare: form.accident.priorMedical || undefined,
    },
    aggravatedPreexisting:
      form.pmh.aggravatedPrevious === "yes" && form.pmh.previousConditionDx.trim() ? form.pmh.previousConditionDx.trim() : undefined,
    physicianNotes: (form.ai?.hpiNotes ?? "").trim() || undefined,
  };
}

async function invoke(mode: "hpi" | "report", facts: Record<string, unknown>): Promise<{ ok: boolean; narrative?: string; error?: string }> {
  try {
    const { data, error } = await supabase().functions.invoke("generate-narrative", { body: { facts, mode } });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: String(data.error) };
    const narrative = String(data?.narrative ?? "").trim();
    if (!narrative) return { ok: false, error: "No draft produced." };
    return { ok: true, narrative };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function draftHpi(form: VisitForm): Promise<{ ok: boolean; narrative?: string; error?: string }> {
  return invoke("hpi", narrativeFacts(form));
}

/**
 * Full Initial Medical Evaluation Report facts (Dr. Falcon's locked specs).
 * Same PHI contract: no names/DOB/address/phone/policy/claim — the model
 * writes [PATIENT_NAME]/[PATIENT_DOB] placeholders substituted at print time.
 */
export function reportFacts(form: VisitForm): Record<string, unknown> {
  const base = narrativeFacts(form);
  const grades: Record<string, string> = { wnl: "within normal limits", limited: "limited", cannot: "cannot perform" };
  const spine: Record<string, unknown> = {};
  for (const [region, row] of Object.entries(form.spineExam)) {
    if (row && (row.tenderness || row.spasm || row.rom))
      spine[region] = { tenderness: row.tenderness || undefined, spasm: row.spasm || undefined, rom: row.rom ? grades[row.rom] ?? row.rom : undefined };
  }
  const functional: Record<string, string> = {};
  for (const [maneuver, grade] of Object.entries(form.romExam)) {
    if (grade) functional[maneuver] = grades[grade] ?? grade;
  }
  const joints: Record<string, unknown> = {};
  for (const [joint, t] of Object.entries(form.jointTenderness)) {
    if (t && (t.R || t.L)) joints[joint] = { right: t.R || undefined, left: t.L || undefined };
  }
  const g = form.gen;
  return {
    ...base,
    encounterMode: form.visitMode,
    dateOfService: form.visitDate,
    chiefComplaints: (form.complaints ?? [])
      .filter((c) => c.region)
      .map((c) => ({ region: c.region, side: c.side || undefined, painScale: c.pain || undefined, note: c.note || undefined })),
    insuranceCarrier: form.patient.insuranceCarrier || "Pending",
    telehealthConsent: form.visitMode === "telehealth" ? { obtained: form.telehealth.consentObtained, witnessedBy: form.telehealth.consentBy || undefined } : undefined,
    vitals: { bp: g.bp || undefined, pulse: g.pulse || undefined, resp: g.resp || undefined, temp: g.temp || undefined },
    generalAppearance: [g.appearance, g.posture, g.mood, g.cognition].filter(Boolean).join("; ") || undefined,
    pmh: {
      hypertension: form.pmh.hypertension || undefined,
      diabetes: form.pmh.diabetes || undefined,
      heartDisease: form.pmh.heartDisease || undefined,
      medications: form.pmh.medications || undefined,
      allergies: form.pmh.allergies || undefined,
      surgeries: form.pmh.surgeries || undefined,
      priorAccidents: form.pmh.previousAccidents || undefined,
      smoking: form.pmh.smoking || undefined,
      alcohol: form.pmh.alcohol || undefined,
      drugs: form.pmh.drugs || undefined,
      pregnant: form.pmh.pregnant || undefined,
      lmp: form.pmh.lmp || undefined,
      aggravatedPreexisting: form.pmh.aggravatedPrevious === "yes" ? form.pmh.previousConditionDx || "yes" : undefined,
    },
    exam: { spine, functional, joints },
    plan: {
      emLevel: form.plan.emLevel || undefined,
      ptFrequency: form.plan.ptFrequency || undefined,
      ptDuration: form.plan.ptDuration || undefined,
      modalities: form.plan.modalities,
      proceduresPerformed: form.plan.procedures ?? [],
      procedureNote: (form.plan.procedureNote ?? "").trim() || undefined,
      followUp: form.plan.followUp || undefined,
      emcDetermination: form.plan.emc || undefined,
      causationOpinion: form.plan.causation || undefined,
      prognosis: form.plan.prognosis || undefined,
      medicalNecessity: form.plan.medicalNecessity.trim() || undefined,
    },
    imagingOrdered: form.imaging.selected,
    otherImaging: { mri: form.imaging.mriRegion || undefined, ct: form.imaging.ctRegion || undefined, us: form.imaging.usRegion || undefined },
  };
}

export async function draftInitialReport(form: VisitForm): Promise<{ ok: boolean; narrative?: string; error?: string }> {
  return invoke("report", reportFacts(form));
}
