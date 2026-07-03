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

export async function draftHpi(form: VisitForm): Promise<{ ok: boolean; narrative?: string; error?: string }> {
  try {
    const { data, error } = await supabase().functions.invoke("generate-narrative", {
      body: { facts: narrativeFacts(form) },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: String(data.error) };
    const narrative = String(data?.narrative ?? "").trim();
    if (!narrative) return { ok: false, error: "No draft produced." };
    return { ok: true, narrative };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
