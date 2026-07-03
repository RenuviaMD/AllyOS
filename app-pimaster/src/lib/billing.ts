import { CLINIC } from "./clinic";
import { ADVANCED_IMAGING, EM_LEVELS, PROCEDURES, PT_MODALITIES, xrayFeeItems } from "./cpt";
import type { VisitForm } from "./types";

/**
 * Per-clinic billing identity + fee schedule. Editable in the app (Billing
 * Settings); charges left blank print as blank — never invented.
 */
export interface BillingSettings {
  ein: string;
  billingNpi: string;
  renderingNpi: string;
  /** CPT -> charge in dollars (string to preserve exact entry) */
  fees: Record<string, string>;
}

const LS_KEY = "pimaster-billing";

export function loadBillingSettings(): BillingSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ein: "", billingNpi: "", renderingNpi: CLINIC.npi, fees: {}, ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return { ein: "", billingNpi: "", renderingNpi: CLINIC.npi, fees: {} };
}

export function saveBillingSettings(s: BillingSettings): void {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export type FeeGroup = "E/M Visits" | "Procedures" | "PT Modalities" | "X-Ray" | "MRI / CT / Ultrasound";

/** All CPTs the clinic can price: E/M levels, procedures, PT modalities, and imaging (X-ray + MRI/CT/US). */
export function billableCpts(): { cpt: string; name: string; group: FeeGroup }[] {
  return [
    ...EM_LEVELS.map((e) => ({ cpt: e.code, name: e.label, group: "E/M Visits" as FeeGroup })),
    ...PROCEDURES.map((p) => ({ cpt: p.cpt, name: p.name, group: "Procedures" as FeeGroup })),
    ...PT_MODALITIES.map((m) => ({ cpt: m.cpt, name: m.name, group: "PT Modalities" as FeeGroup })),
    ...xrayFeeItems().map((x) => ({ cpt: x.cpt, name: x.name, group: "X-Ray" as FeeGroup })),
    ...ADVANCED_IMAGING.map((a) => ({ cpt: a.cpt, name: a.name, group: "MRI / CT / Ultrasound" as FeeGroup })),
  ];
}

/** Catalog category for a CPT — matches the clinic_service_catalog category values. */
export function cptCategory(cpt: string): "em" | "pt" | "imaging" | "other" {
  if (cpt.startsWith("99")) return "em";
  if (cpt.startsWith("97")) return "pt";
  if (PROCEDURES.some((p) => p.cpt === cpt)) return "other";
  return "imaging";
}

export interface ServiceLine {
  cpt: string;
  description: string;
  modifier: string;
  pos: string;
  units: number;
  charge: string; // blank if not configured
}

export function posCode(form: Pick<VisitForm, "visitMode">): string {
  // Facility-originated telehealth: patient is never at home, so POS 02 (not 10).
  return form.visitMode === "telehealth" ? "02" : "11";
}

/** Service lines for an MD encounter (E/M) or a PT session (treatments provided). */
export function buildServiceLines(form: VisitForm, settings: BillingSettings, encounter: "md" | "pt"): ServiceLine[] {
  const pos = posCode(form);
  const modifier = form.visitMode === "telehealth" ? "95" : "";
  const lines: ServiceLine[] = [];
  if (encounter === "md") {
    if (form.plan.emLevel) {
      const em = EM_LEVELS.find((e) => e.code === form.plan.emLevel);
      lines.push({
        cpt: form.plan.emLevel,
        description: em?.label ?? "Evaluation & Management",
        modifier,
        pos,
        units: 1,
        charge: normalizeMoney(settings.fees[form.plan.emLevel] ?? ""),
      });
    }
    // Procedures performed this visit — hands-on, always in person (the audit
    // blocks a telehealth note that carries a procedure).
    for (const cpt of form.plan.procedures ?? []) {
      const proc = PROCEDURES.find((p) => p.cpt === cpt);
      lines.push({
        cpt,
        description: proc?.name ?? cpt,
        modifier: "",
        pos: "11",
        units: 1,
        charge: normalizeMoney(settings.fees[cpt] ?? ""),
      });
    }
  } else {
    for (const cpt of form.ptDaily.treatments) {
      const mod = PT_MODALITIES.find((m) => m.cpt === cpt);
      lines.push({
        cpt,
        description: mod?.name ?? cpt,
        // PT treatments are hands-on services delivered at the clinic — always in person.
        modifier: "",
        pos: "11",
        units: 1,
        charge: normalizeMoney(settings.fees[cpt] ?? ""),
      });
    }
  }
  return lines;
}

/** Parse a fee that may contain a leading $ or thousands commas. Returns null if not a clean amount. */
export function parseMoney(raw: string): number | null {
  const cleaned = (raw ?? "").trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return parseFloat(cleaned);
}

/** Normalized charge string ("" if the entry is not a clean amount) — keeps line charges and the total in agreement. */
export function normalizeMoney(raw: string): string {
  const v = parseMoney(raw);
  return v === null ? "" : v.toFixed(2);
}

export function totalCharges(lines: ServiceLine[]): string {
  let total = 0;
  let any = false;
  for (const l of lines) {
    const v = parseMoney(l.charge);
    if (v !== null) {
      total += v * l.units;
      any = true;
    }
  }
  return any ? total.toFixed(2) : "";
}
