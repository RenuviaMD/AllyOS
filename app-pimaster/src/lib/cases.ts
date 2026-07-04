import { patientKeyOf, packetStatus, MODE_TITLES } from "./today";
import type { VisitForm } from "./types";

/**
 * Case index (Patients registry + Case Detail, UX Blueprint U5) — pure logic.
 * A CASE is one accident event: patient (name + DOB) + date of accident. A
 * patient with two accidents has two cases. Built client-side from archived
 * report metadata; statuses derive strictly from documented visits — nothing
 * invented.
 */

export interface CaseReportRef {
  id: string;
  mode: string;
  dos: string;
  created_at: string;
  form: Partial<VisitForm> | null;
}

export type CaseStatus = "Intake" | "Active" | "In Treatment" | "Discharged";
export type EmcStatus = "Certified" | "Not Certified" | "Pending" | "—";

export interface CaseEntry {
  /** patientKey + DOA */
  key: string;
  patientKey: string;
  /** "Last, First" */
  name: string;
  first: string;
  last: string;
  dob: string;
  phone: string;
  carrier: string;
  claimNumber: string;
  accidentDate: string;
  status: CaseStatus;
  /** EMC determination from the initial note ($10,000 vs $2,500 PIP benefit) */
  emc: EmcStatus;
  visitCounts: { initial: number; followup: number; final: number; pt: number };
  lastDos: string;
  reports: CaseReportRef[];
  /** newest form snapshot — feeds the patient/contact cards */
  latestForm: Partial<VisitForm> | null;
  /** newest CLINICAL note's form (initial/followup/final) — feeds the diagnosis/plan card */
  latestClinicalForm: Partial<VisitForm> | null;
  /** the initial visit's form — packet requirements anchor to the initial visit */
  initialForm: Partial<VisitForm> | null;
}

const CLINICAL = new Set(["initial", "followup", "final"]);
const PT = new Set(["ptdaily", "ptprogress"]);

export function buildCaseIndex(rows: CaseReportRef[]): CaseEntry[] {
  const byKey = new Map<string, CaseEntry>();
  for (const r of rows) {
    const p = r.form?.patient;
    const first = p?.firstName?.trim() ?? "";
    const last = p?.lastName?.trim() ?? "";
    if (!first && !last) continue;
    const doa = r.form?.accident?.accidentDate ?? "";
    const patientKey = patientKeyOf(first, last, p?.dob);
    const key = `${patientKey}#${doa}`;
    let c = byKey.get(key);
    if (!c) {
      c = {
        key,
        patientKey,
        name: `${last}${last && first ? ", " : ""}${first}`,
        first,
        last,
        dob: p?.dob ?? "",
        phone: "",
        carrier: "",
        claimNumber: "",
        accidentDate: doa,
        status: "Intake",
        emc: "—",
        visitCounts: { initial: 0, followup: 0, final: 0, pt: 0 },
        lastDos: "",
        reports: [],
        latestForm: null,
        latestClinicalForm: null,
        initialForm: null,
      };
      byKey.set(key, c);
    }
    c.reports.push(r);
    if (p?.phone) c.phone = p.phone;
    if (p?.insuranceCarrier) c.carrier = p.insuranceCarrier;
    if (p?.claimNumber) c.claimNumber = p.claimNumber;
    if (r.dos >= c.lastDos) {
      c.lastDos = r.dos;
      c.latestForm = r.form ?? c.latestForm;
    }
    if (CLINICAL.has(r.mode) && r.form) c.latestClinicalForm = r.form;
    if (r.mode === "initial") {
      c.visitCounts.initial++;
      if (r.form) c.initialForm = r.form;
      const emc = r.form?.plan?.emc;
      c.emc = emc === "yes" ? "Certified" : emc === "no" ? "Not Certified" : "Pending";
    } else if (r.mode === "followup") c.visitCounts.followup++;
    else if (r.mode === "final") c.visitCounts.final++;
    else if (PT.has(r.mode)) c.visitCounts.pt++;
  }
  for (const c of byKey.values()) {
    c.reports.sort((a, b) => (a.dos === b.dos ? a.created_at.localeCompare(b.created_at) : a.dos.localeCompare(b.dos)));
    c.status =
      c.visitCounts.final > 0
        ? "Discharged"
        : c.visitCounts.followup > 0 || c.visitCounts.pt > 0
          ? "In Treatment"
          : c.visitCounts.initial > 0
            ? "Active"
            : "Intake";
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name) || b.accidentDate.localeCompare(a.accidentDate));
}

/** Cases grouped per patient for the registry (one expandable person, case rows under it). */
export interface PatientGroup {
  patientKey: string;
  name: string;
  dob: string;
  phone: string;
  cases: CaseEntry[];
}

export function groupCasesByPatient(cases: CaseEntry[]): PatientGroup[] {
  const byPatient = new Map<string, PatientGroup>();
  for (const c of cases) {
    let g = byPatient.get(c.patientKey);
    if (!g) {
      g = { patientKey: c.patientKey, name: c.name, dob: c.dob, phone: c.phone, cases: [] };
      byPatient.set(c.patientKey, g);
    }
    g.cases.push(c);
    if (c.phone) g.phone = c.phone;
  }
  return [...byPatient.values()];
}

/** Registry filter: last name, first name, or phone digits (any length here — the registry has its own box). */
export function filterGroups(groups: PatientGroup[], query: string): PatientGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const digits = q.replace(/\D/g, "");
  const phoneQuery = digits.length >= 3 && digits.length === q.replace(/[\s()-]/g, "").length;
  return groups.filter((g) => (phoneQuery ? g.phone.replace(/\D/g, "").includes(digits) : g.name.toLowerCase().includes(q)));
}

/** Pinned action item on the case timeline (U5). */
export interface ActionItem {
  kind: "packet" | "emc" | "imaging";
  label: string;
}

/**
 * Action items pinned on top of the timeline: unsigned packet forms, EMC
 * pending, imaging ordered but never reviewed. Derived only from what is
 * (or is not) documented.
 */
export function caseActionItems(c: CaseEntry, packetDocs: Record<string, string[]> | undefined): ActionItem[] {
  const items: ActionItem[] = [];
  // Packet requirements anchor to the initial visit — a newer PT session
  // (visitType followup) must not make the once-per-patient forms look moot.
  const packetForm = c.initialForm ?? c.latestForm;
  if (packetForm) {
    const pkt = packetStatus(packetForm, packetDocs, c.lastDos);
    if (pkt.missing.length > 0) items.push({ kind: "packet", label: `Reception packet incomplete — ${pkt.missing.join(", ")}` });
  }
  if (c.emc === "Pending") items.push({ kind: "emc", label: "EMC determination pending — decides the $10,000 vs $2,500 PIP benefit" });
  const ordered = c.reports.some((r) => r.mode === "initial" && (r.form?.imaging?.selected?.length ?? 0) > 0);
  if (ordered && c.status !== "Discharged") {
    const reviewed = c.reports.some(
      (r) =>
        (r.mode === "followup" || r.mode === "final") &&
        ((r.form?.imagingReview?.images ?? []).some((i) => i.reviewed) || (r.form?.imagingReview?.findings ?? "").trim() !== ""),
    );
    if (!reviewed) items.push({ kind: "imaging", label: "Imaging ordered — results not yet reviewed" });
  }
  return items;
}

export interface TimelineEntry {
  id: string;
  dos: string;
  time: string;
  title: string;
  mode: string;
}

/** Chronological record, newest first. */
export function caseTimeline(c: CaseEntry): TimelineEntry[] {
  return [...c.reports]
    .sort((a, b) => (b.dos === a.dos ? b.created_at.localeCompare(a.created_at) : b.dos.localeCompare(a.dos)))
    .map((r) => ({
      id: r.id,
      dos: r.dos,
      time: r.created_at.length >= 16 ? r.created_at.slice(11, 16) : "",
      title: MODE_TITLES[r.mode] ?? r.mode,
      mode: r.mode,
    }));
}

export function isClinicalMode(mode: string): boolean {
  return CLINICAL.has(mode);
}
