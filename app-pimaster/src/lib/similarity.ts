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
 * The narrative text compared between same-accident patients.
 * Only patient-specific narrative content — no letterhead, statutory, or
 * certification boilerplate (those are legitimately identical on every note).
 */
export function narrativeFingerprint(form: Pick<VisitForm, "plan">, hpi: string): string {
  return [hpi, form.plan.medicalNecessity].filter(Boolean).join(" ");
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
