import { PACKAGE_DOCS } from "./packageDocs";
import type { VisitForm } from "./types";

/**
 * Today's Visits landing (UX Blueprint U1) — pure grouping/status logic.
 * Data sources: reports with DOS = today plus the active draft; the staff
 * variant adds packet status computed from the archived package documents.
 */

/** Clinical note modes shown on the physician queue. */
export const CLINICAL_MODES = ["initial", "followup", "final"];
/** PT session modes shown on the PT landing. */
export const PT_MODES = ["ptdaily", "ptprogress"];

export const MODE_TITLES: Record<string, string> = {
  initial: "Initial Evaluation",
  followup: "Follow-Up Visit",
  final: "Final / Discharge",
  ptdaily: "PT Daily Session",
  ptprogress: "PT Weekly Summary",
  aob: "AOB",
  records_release: "Records Release",
  attestation14: "14-Day Attestation",
  pip_regulation: "PIP Regulation Sheet",
  excluded_services: "Excluded Services Ack.",
  oir_disclosure: "OIR Disclosure (B1-1571)",
  telehealth_consent: "Telehealth Consent",
  affidavit: "Sworn Affidavit",
  billing_package: "Billing Package",
};

export interface DayReportLike {
  id: string;
  mode: string;
  dos: string;
  created_at: string;
  form: Partial<VisitForm> | null;
}

export function patientKeyOf(first?: string, last?: string, dob?: string): string {
  return `${(first ?? "").trim().toLowerCase()} ${(last ?? "").trim().toLowerCase()}|${(dob ?? "").trim()}`;
}

export interface TodayVisitRow {
  key: string;
  /** "Last, First" */
  name: string;
  dob: string;
  visitMode: string;
  visitType: string;
  /** documents generated today for this patient, in creation order */
  documented: { mode: string; time: string; id: string }[];
  /** true when this patient is the active (unsaved) draft — the open encounter */
  hasDraft: boolean;
  form: Partial<VisitForm> | null;
}

function displayName(p?: Partial<VisitForm>["patient"]): string {
  const last = p?.lastName?.trim() ?? "";
  const first = p?.firstName?.trim() ?? "";
  return `${last}${last && first ? ", " : ""}${first}`.trim();
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Group today's reports (already filtered to DOS = today) by patient and merge
 * in the active draft. `modeFilter` narrows which documents count for the
 * viewing role (clinical notes for the physician, PT sessions for PT,
 * everything for staff). The draft row is always included when it has a name.
 */
export function buildTodayRows(
  reports: DayReportLike[],
  draft: VisitForm | null,
  modeFilter?: (mode: string) => boolean,
): TodayVisitRow[] {
  const rows = new Map<string, TodayVisitRow>();

  for (const r of reports) {
    if (modeFilter && !modeFilter(r.mode)) continue;
    const p = r.form?.patient;
    const name = displayName(p);
    if (!name) continue;
    const key = patientKeyOf(p?.firstName, p?.lastName, p?.dob);
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        name,
        dob: p?.dob ?? "",
        visitMode: r.form?.visitMode ?? "",
        visitType: r.form?.visitType ?? "",
        documented: [],
        hasDraft: false,
        form: r.form,
      };
      rows.set(key, row);
    }
    row.documented.push({ mode: r.mode, time: fmtTime(r.created_at), id: r.id });
    // latest report wins for badges/status
    row.visitMode = r.form?.visitMode ?? row.visitMode;
    row.visitType = r.form?.visitType ?? row.visitType;
    row.form = r.form ?? row.form;
  }

  const draftName = displayName(draft?.patient);
  if (draft && draftName) {
    const key = patientKeyOf(draft.patient.firstName, draft.patient.lastName, draft.patient.dob);
    const row = rows.get(key);
    if (row) {
      row.hasDraft = true;
      row.visitMode = draft.visitMode;
      row.visitType = draft.visitType;
      row.form = draft;
    } else {
      rows.set(key, {
        key,
        name: draftName,
        dob: draft.patient.dob,
        visitMode: draft.visitMode,
        visitType: draft.visitType,
        documented: [],
        hasDraft: true,
        form: draft,
      });
    }
  }

  // The open encounter (draft) first, then by first-documented order.
  return [...rows.values()].sort((a, b) => Number(b.hasDraft) - Number(a.hasDraft));
}

/** Archived package documents grouped patient → kind → DOS list. */
export function groupPackageDocs(rows: DayReportLike[]): Record<string, Record<string, string[]>> {
  const out: Record<string, Record<string, string[]>> = {};
  for (const r of rows) {
    const p = r.form?.patient;
    const name = displayName(p);
    if (!name) continue;
    const key = patientKeyOf(p?.firstName, p?.lastName, p?.dob);
    const byKind = (out[key] ??= {});
    (byKind[r.mode] ??= []).push(r.dos);
  }
  return out;
}

export interface PacketStatus {
  /** staff-produced form titles already signed */
  done: string[];
  /** staff-produced form titles still needed for this visit */
  missing: string[];
}

/**
 * Reception packet status for one patient (staff landing). Once-per-patient
 * forms count as done if signed on any prior visit; per-visit forms
 * (telehealth consent) must be signed for THIS date of service.
 */
export function packetStatus(
  form: Partial<VisitForm>,
  docs: Record<string, string[]> | undefined,
  visitDate: string,
): PacketStatus {
  const done: string[] = [];
  const missing: string[] = [];
  for (const d of PACKAGE_DOCS) {
    if (d.producer !== "staff") continue;
    if (!d.appliesTo(form as VisitForm)) continue;
    const dosList = docs?.[d.kind] ?? [];
    const ok = d.oncePerPatient ? dosList.length > 0 : dosList.includes(visitDate);
    (ok ? done : missing).push(d.title);
  }
  return { done, missing };
}
