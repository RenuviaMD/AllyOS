import { medicalNecessityTemplate } from "./narratives";
import { EXAM_REGIONS, SPINE_REGION_IDS } from "./rom";
import type { VisitForm } from "./types";

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(s: string, n: number): Set<string> {
  const words = normalizeText(s).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return out;
}

/** Jaccard similarity of word n-gram shingles (0..1). */
export function ngramJaccard(a: string, b: string, n = 5): number {
  const sa = shingles(a, n);
  const sb = shingles(b, n);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const g of sa) if (sb.has(g)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * The narrative text compared between same-accident patients — ONLY
 * physician-authored free text. The auto-generated HPI (injuryNarrative) is
 * deterministic template text driven by structured dropdowns, so two occupants
 * of the same crash produce near-identical HPIs by construction; including it
 * would hard-block legitimate co-occupant notes. The seeded medical-necessity
 * template prefix is also stripped so an un-edited template contributes nothing.
 */
export function narrativeFingerprint(form: Pick<VisitForm, "plan" | "visitType">): string {
  const nec = form.plan.medicalNecessity ?? "";
  const tmpl = medicalNecessityTemplate(form.visitType);
  const authored = nec.startsWith(tmpl) ? nec.slice(tmpl.length) : nec;
  return authored.trim();
}

/** Set of documented exam findings, for detecting carbon-copy examinations. */
export function findingsSet(form: Pick<VisitForm, "romExam" | "spineExam" | "jointTenderness">): Set<string> {
  const out = new Set<string>();
  for (const region of EXAM_REGIONS) {
    for (const mv of region.maneuvers) {
      const g = form.romExam[mv.id];
      if (g) out.add(`${mv.id}:${g}`);
    }
  }
  for (const id of SPINE_REGION_IDS) {
    const row = form.spineExam?.[id];
    if (row?.tenderness) out.add(`${id}:tender:${row.tenderness}`);
    if (row?.spasm) out.add(`${id}:spasm:${row.spasm}`);
    if (row?.rom) out.add(`${id}:rom:${row.rom}`);
  }
  for (const [joint, t] of Object.entries(form.jointTenderness ?? {})) {
    if (t.R) out.add(`${joint}:R:${t.R}`);
    if (t.L) out.add(`${joint}:L:${t.L}`);
  }
  return out;
}

export function setJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface SimilarityHit {
  otherPatient: string;
  textSimilarity: number; // 0..1
  findingsSimilarity: number; // 0..1
}

export const TEXT_SIMILARITY_LIMIT = 0.2;
export const FINDINGS_SIMILARITY_WARN = 0.9;
/** With this many same-accident patients sharing a near-identical exam, warning escalates to block. */
export const COHORT_CARBON_COPY_BLOCK = 2;

/** One same-accident patient, aggregated across all of their notes. */
export interface CohortPeer {
  patient: string;
  role: string;
  maxTextSimilarity: number;
  maxFindingsSimilarity: number;
}

/**
 * Multi-occupant (3+ people in one accident) rules, applied on top of the
 * pairwise checks. Every new note is compared against EVERY other patient
 * from the accident — the guard scales with the cohort, it never samples.
 */
export function evaluateCohort(myRole: string, peers: CohortPeer[]): { blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (peers.length === 0) return { blockers, warnings };

  warnings.push(
    `Same-accident cohort: ${peers.length} other patient(s) on file (${peers.map((p) => p.patient).join(", ")}) — this note was checked against all of them.`,
  );

  // One vehicle has exactly one driver. Same-date accidents can involve two
  // vehicles, so this is a verify-warning, not a block.
  if (myRole === "Driver") {
    const otherDrivers = peers.filter((p) => p.role === "Driver");
    if (otherDrivers.length > 0) {
      warnings.push(
        `${otherDrivers.map((p) => p.patient).join(", ")} from the same accident is also documented as Driver. One vehicle has one driver — verify roles/seat positions in Section 2 (use Front/Rear Passenger), or confirm this was a separate vehicle.`,
      );
    }
  }

  // Two identical exams is a warning (pairwise); an entire cohort with
  // near-identical exams blocks until each patient's real distinguishing
  // findings are documented — never fabricate differences.
  const carbonCopies = peers.filter((p) => p.maxFindingsSimilarity > FINDINGS_SIMILARITY_WARN);
  if (carbonCopies.length >= COHORT_CARBON_COPY_BLOCK) {
    blockers.push(
      `Exam findings are nearly identical to ${carbonCopies.length} other patients from this accident (${carbonCopies
        .map((p) => p.patient)
        .join(", ")}). Three or more matching exams will not pass review — re-examine and document each patient's real distinguishing findings (seat position, impact side, individual complaints). Do not fabricate differences.`,
    );
  }

  return { blockers, warnings };
}

export interface PeerNote {
  patientLabel: string;
  narrative: string;
  findings: Set<string>;
}

/** Compare this note against peer notes from the same accident. */
export function compareToPeers(narrative: string, findings: Set<string>, peers: PeerNote[]): SimilarityHit[] {
  return peers.map((p) => ({
    otherPatient: p.patientLabel,
    textSimilarity: ngramJaccard(narrative, p.narrative),
    findingsSimilarity: setJaccard(findings, p.findings),
  }));
}
