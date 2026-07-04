import { buildServiceLines, parseMoney, totalCharges, type BillingSettings } from "./billing";
import { allDiagnosisCodes } from "./report";
import { emptyForm, type VisitForm } from "./types";

/**
 * Insurance billing package — the batch-and-audit layer. Florida PIP carriers
 * accept MAILED paper claims only, so a package is a printable bundle: cover
 * sheet + every archived visit note + a superbill and CMS-1500 rebuilt from
 * each visit's saved snapshot. Batches follow the 8-visit convention; the
 * pre-submission audit (hard stops vs warnings) gates the build. Everything
 * derives from documented data — blank stays blank, nothing invented.
 */

/** Visit modes that belong in a billing package, in a case's DOS order. */
export const PACKAGE_VISIT_MODES = ["initial", "followup", "final", "ptdaily", "ptprogress"];
/** Modes that carry billable service lines (superbill + CMS-1500 per visit). */
export const MD_MODES = new Set(["initial", "followup", "final"]);

export type PackageStatus = "not_sent" | "sent" | "paid" | "denied";

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  not_sent: "Not Sent",
  sent: "Sent",
  paid: "Paid",
  denied: "Denied",
};

export interface PackageVisitRef {
  id: string;
  mode: string;
  dos: string;
  form: Partial<VisitForm> | null;
}

export interface VisitBatch {
  /** 1-based, in treatment order */
  index: number;
  visits: PackageVisitRef[];
  firstDos: string;
  lastDos: string;
}

/** Chunk a case's package-relevant documents into 8-visit batches (DOS order preserved). */
export function buildVisitBatches(reports: PackageVisitRef[], size = 8): VisitBatch[] {
  const visits = reports.filter((r) => PACKAGE_VISIT_MODES.includes(r.mode));
  const out: VisitBatch[] = [];
  for (let i = 0; i < visits.length; i += size) {
    const chunk = visits.slice(i, i + size);
    out.push({
      index: out.length + 1,
      visits: chunk,
      firstDos: chunk[0].dos,
      lastDos: chunk[chunk.length - 1].dos,
    });
  }
  return out;
}

/** Rehydrate an archived form snapshot to a full VisitForm (top-level merge, same as the draft loader). */
export function fullForm(partial: Partial<VisitForm> | null): VisitForm {
  return { ...emptyForm(), ...(partial ?? {}) };
}

export interface PackageAudit {
  /** hard stops — the package cannot be built */
  stops: string[];
  /** warnings — reviewed, do not block */
  warnings: string[];
  /** total billed across the batch ("" when no charges configured) */
  totalBilled: string;
}

/**
 * Pre-submission audit for one batch. Identity and mailing checks are hard
 * stops (carriers only accept complete mailed claims); pricing and benefit
 * context are warnings.
 */
export function auditPackage(
  visits: PackageVisitRef[],
  settings: BillingSettings,
  claimsAddress: string,
): PackageAudit {
  const stops: string[] = [];
  const warnings: string[] = [];

  const clinical = [...visits].reverse().find((v) => MD_MODES.has(v.mode))?.form ?? visits[visits.length - 1]?.form ?? null;
  const f = fullForm(clinical);
  const p = f.patient;

  if (!p.firstName.trim() || !p.lastName.trim()) stops.push("Patient name is missing (CMS-1500 Box 2).");
  if (!p.dob) stops.push("Patient date of birth is missing (Box 3).");
  if (!p.address.trim() || !p.city.trim() || !p.zip.trim()) stops.push("Patient mailing address is incomplete (Box 5).");
  if (!f.accident.accidentDate) stops.push("Accident date is missing (Box 14 — auto accident).");
  if (!p.insuranceCarrier.trim()) stops.push("Insurance carrier is missing (Box 11c / mailing target).");
  if (!claimsAddress.trim())
    stops.push("Carrier claims MAILING address is missing — PIP carriers accept mailed claims only. Add it in Catalogs → Carriers.");
  if (!settings.ein) stops.push("Federal Tax ID (EIN) is not set (Box 25) — open Billing Settings.");
  if (!settings.billingNpi) stops.push("Clinic (group) billing NPI is not set (Box 33a) — open Billing Settings.");
  if (!settings.renderingNpi) stops.push("Rendering provider NPI is not set (Box 24J) — open Billing Settings.");

  const mdVisits = visits.filter((v) => MD_MODES.has(v.mode));
  if (mdVisits.length > 0 && allDiagnosisCodes(fullForm(mdVisits[mdVisits.length - 1].form)).length === 0)
    stops.push("No diagnosis codes on the batch's MD documentation (Box 21).");

  const unpriced = new Set<string>();
  let total = 0;
  let anyCharge = false;
  for (const v of visits) {
    const vf = fullForm(v.form);
    if (MD_MODES.has(v.mode)) {
      const lines = buildServiceLines(vf, settings, "md");
      if (lines.length === 0) stops.push(`MD visit ${v.dos}: no E/M level selected — the superbill would be empty (Box 24).`);
      for (const l of lines) {
        if (!l.charge) unpriced.add(l.cpt);
        const amt = parseMoney(l.charge);
        if (amt !== null) {
          total += amt * l.units;
          anyCharge = true;
        }
      }
    } else if (v.mode === "ptdaily") {
      const lines = buildServiceLines(vf, settings, "pt");
      if (lines.length === 0) stops.push(`PT session ${v.dos}: no treatments documented — nothing billable.`);
      for (const l of lines) {
        if (!l.charge) unpriced.add(l.cpt);
        const amt = parseMoney(l.charge);
        if (amt !== null) {
          total += amt * l.units;
          anyCharge = true;
        }
      }
    }
  }

  if (!p.policyNumber.trim()) warnings.push("Policy number is blank (Box 11) — prints blank.");
  if (!(p.claimNumber ?? "").trim()) warnings.push("PIP claim number is blank — prints blank.");
  if (unpriced.size > 0)
    warnings.push(`No charge configured for CPT ${[...unpriced].sort().join(", ")} — those lines print blank (fee schedule).`);
  const initial = visits.find((v) => v.mode === "initial");
  if (initial && fullForm(initial.form).plan.emc !== "yes")
    warnings.push("EMC is not certified on the initial visit — the PIP benefit is capped at $2,500 (§ 627.732(4) / § 627.736).");
  if (f.accident.accidentDate && visits.length > 0) {
    const yearMs = 366 * 86400000;
    const last = new Date(visits[visits.length - 1].dos + "T00:00:00Z").getTime();
    const acc = new Date(f.accident.accidentDate + "T00:00:00Z").getTime();
    if (last - acc > yearMs) warnings.push("Batch includes services more than 1 year post-accident — expect carrier scrutiny.");
  }

  return { stops, warnings, totalBilled: anyCharge ? total.toFixed(2) : "" };
}

/** Manifest lines for the cover sheet, from the batch composition. */
export function packageManifest(visits: PackageVisitRef[]): string[] {
  const md = visits.filter((v) => MD_MODES.has(v.mode)).length;
  const ptd = visits.filter((v) => v.mode === "ptdaily").length;
  const ptw = visits.filter((v) => v.mode === "ptprogress").length;
  const claims = md + ptd; // superbill + CMS-1500 per billable visit
  const out = ["Cover Sheet (this page)"];
  if (md > 0) out.push(`Physician visit notes × ${md}`);
  if (ptd > 0) out.push(`PT daily session notes × ${ptd}`);
  if (ptw > 0) out.push(`PT weekly summaries × ${ptw}`);
  if (claims > 0) out.push(`Superbills × ${claims}`, `CMS-1500 claim forms × ${claims}`);
  return out;
}

/** Total charges for one visit snapshot (used to show per-visit amounts). */
export function visitCharges(v: PackageVisitRef, settings: BillingSettings): string {
  const vf = fullForm(v.form);
  if (MD_MODES.has(v.mode)) return totalCharges(buildServiceLines(vf, settings, "md"));
  if (v.mode === "ptdaily") return totalCharges(buildServiceLines(vf, settings, "pt"));
  return "";
}
