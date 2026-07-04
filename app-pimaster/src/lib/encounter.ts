import type { Role } from "./types";

/**
 * Encounter stepper (UX Blueprint U3) — the physician's 12-section scroll
 * becomes the phased MD Visit module: History → Exam → Assessment → Plan →
 * Sign. Staff intake stays a 2-step flow; PT keeps its module (no stepper).
 * Pure phase definitions + section→phase mapping so the audit's "jump to
 * Section N" can switch phases. Every section keeps its exact fields and
 * visibility rules — only the arrangement changes.
 */

export const MD_PHASES = ["History", "Exam", "Assessment", "Plan", "Sign"] as const;
export const STAFF_PHASES = ["Check-In", "Accident & Consent"] as const;

export function phasesFor(role: Role): readonly string[] {
  return role === "physician" ? MD_PHASES : role === "staff" ? STAFF_PHASES : [];
}

/** Which phase a numbered chart section lives in, per role. */
export function phaseForSection(role: Role, section: number): number | undefined {
  if (role === "physician") {
    const map: Record<number, number> = {
      1: 0, // Check-in
      2: 0, // Injury / accident
      3: 0, // PMH
      4: 1, // General exam
      5: 1, // Functional exam
      6: 2, // Assessment / ICD-10
      9: 2, // Imaging review (follow-up/final)
      7: 3, // Plan of treatment
      8: 3, // Image orders (initial)
      10: 3, // Discharge (final)
    };
    return map[section];
  }
  if (role === "staff") return section <= 1 ? 0 : 1;
  return undefined;
}

/** The Sign phase index for the physician flow. */
export const MD_SIGN_PHASE = MD_PHASES.length - 1;
