/**
 * Check-in flagger (spec §5.4). Pure, deterministic, exhaustively testable.
 *
 * Rules that route a patient check-in to the MD inbox:
 *   - pain score >= 7
 *   - free text mentions a "new mass" / new lump
 *   - free text describes severe abdominal pain
 *
 * Conservative by design: when in doubt it flags. Matching is word-boundary
 * based to avoid false hits (e.g. "massage", "no new mass" still flags — a
 * human reviews, which is the safe failure mode).
 */

export type FlagRuleId = "pain_ge_7" | "new_mass" | "severe_abdominal_pain";

export interface CheckInInput {
  /** 0-10; undefined when not reported. */
  painScore?: number;
  freeText?: string;
}

export interface FlagResult {
  flagged: boolean;
  reasons: FlagRuleId[];
}

const NEW_MASS = /\bnew\b[\w\s,]*\b(mass|lump|growth|nodule|bump)\b/i;
const MASS_NEW = /\b(mass|lump|growth|nodule)\b[\w\s,]*\bnew\b/i;
const SEVERE_ABDO =
  /\b(severe|extreme|worst|excruciating|intense|sharp)\b[\w\s,]*\b(abdominal|abdomen|stomach|belly|gut)\b[\w\s,]*\b(pain|ache|cramp)?/i;
const ABDO_SEVERE =
  /\b(abdominal|abdomen|stomach|belly)\b[\w\s,]*\b(pain|ache)\b[\w\s,]*\b(severe|extreme|worst|unbearable)\b/i;

export function evaluateCheckIn(input: CheckInInput): FlagResult {
  const reasons: FlagRuleId[] = [];

  if (typeof input.painScore === "number" && input.painScore >= 7) {
    reasons.push("pain_ge_7");
  }

  const text = (input.freeText ?? "").trim();
  if (text.length > 0) {
    if (NEW_MASS.test(text) || MASS_NEW.test(text)) reasons.push("new_mass");
    if (SEVERE_ABDO.test(text) || ABDO_SEVERE.test(text)) reasons.push("severe_abdominal_pain");
  }

  return { flagged: reasons.length > 0, reasons };
}

export const FLAG_LABELS: Record<FlagRuleId, string> = {
  pain_ge_7: "Pain score ≥ 7",
  new_mass: "Reports a new mass / lump",
  severe_abdominal_pain: "Reports severe abdominal pain",
};
