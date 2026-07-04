import { patientKeyOf } from "./today";
import type { VisitForm } from "./types";

/**
 * Patient search index (UX Blueprint U6) — built client-side from archived
 * report metadata, grouped per person (name + DOB). Search activates at 3+
 * characters of last name, first name, or phone digits — the old build's
 * sidebar convention.
 */

export interface ReportMetaLike {
  id: string;
  mode: string;
  dos: string;
  form: Partial<VisitForm> | null;
}

export interface PatientIndexEntry {
  key: string;
  /** "Last, First" */
  name: string;
  first: string;
  last: string;
  dob: string;
  phone: string;
  /** digits only, for phone search */
  phoneDigits: string;
  carrier: string;
  accidentDate: string;
  lastDos: string;
  /** clinical notes only (initial/followup/final) */
  visitCount: number;
  /** true once a final/discharge note exists */
  discharged: boolean;
}

const CLINICAL = new Set(["initial", "followup", "final"]);

export function buildPatientIndex(rows: ReportMetaLike[]): PatientIndexEntry[] {
  const byKey = new Map<string, PatientIndexEntry>();
  for (const r of rows) {
    const p = r.form?.patient;
    const first = p?.firstName?.trim() ?? "";
    const last = p?.lastName?.trim() ?? "";
    if (!first && !last) continue;
    const key = patientKeyOf(first, last, p?.dob);
    let e = byKey.get(key);
    if (!e) {
      e = {
        key,
        name: `${last}${last && first ? ", " : ""}${first}`,
        first,
        last,
        dob: p?.dob ?? "",
        phone: "",
        phoneDigits: "",
        carrier: "",
        accidentDate: "",
        lastDos: "",
        visitCount: 0,
        discharged: false,
      };
      byKey.set(key, e);
    }
    // newest data wins for contact/claim fields
    if (p?.phone) {
      e.phone = p.phone;
      e.phoneDigits = p.phone.replace(/\D/g, "");
    }
    if (p?.insuranceCarrier) e.carrier = p.insuranceCarrier;
    if (r.form?.accident?.accidentDate) e.accidentDate = r.form.accident.accidentDate;
    if (r.dos > e.lastDos) e.lastDos = r.dos;
    if (CLINICAL.has(r.mode)) {
      e.visitCount++;
      if (r.mode === "final") e.discharged = true;
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Minimum characters before the search activates. */
export const SEARCH_MIN = 3;

/**
 * 3+ characters of last name, first name, or phone digits. A digit query
 * matches anywhere in the phone number; a letter query matches the start of
 * the last or first name (prefix matches sort first, then substring).
 */
export function searchPatients(index: PatientIndexEntry[], query: string): PatientIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < SEARCH_MIN) return [];
  const digits = q.replace(/\D/g, "");
  if (digits.length >= SEARCH_MIN && digits.length === q.replace(/[\s()-]/g, "").length) {
    return index.filter((e) => e.phoneDigits.includes(digits));
  }
  const prefix: PatientIndexEntry[] = [];
  const substr: PatientIndexEntry[] = [];
  for (const e of index) {
    const last = e.last.toLowerCase();
    const first = e.first.toLowerCase();
    if (last.startsWith(q) || first.startsWith(q)) prefix.push(e);
    else if (last.includes(q) || first.includes(q)) substr.push(e);
  }
  return [...prefix, ...substr];
}
