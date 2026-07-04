/**
 * Physician phrase library (UX Blueprint U4) — quick-texts the physician taps
 * to insert into the HPI notes and procedure notes, then edits to the patient.
 * Insertion is always physician-initiated and editable: the library speeds
 * typing, it never generates findings. Standard EMR register throughout.
 * Custom phrases (and hidden defaults) persist per device in localStorage.
 */

export type PhraseCategory = "hpi" | "procedure";

export const DEFAULT_PHRASES: Record<PhraseCategory, string[]> = {
  hpi: [
    "c/o neck pain radiating to B/L trapezii, worse with rotation",
    "c/o low back pain radiating to buttock/posterior thigh, no sx below knee",
    "onset immediately post-MVC; denies LOC; ambulatory at scene",
    "sx onset next morning with stiffness and decreased ROM",
    "denies HA, dizziness, visual changes, N/V",
    "pain interferes with sleep, driving, and lifting",
    "improving with PT; residual end-range stiffness",
    "no prior similar complaints; no pre-existing conditions in affected regions",
  ],
  procedure: [
    "TPI: cervical paraspinals B/L; 1% lidocaine 1 mL per site; tolerated well, no complications",
    "TPI: lumbar paraspinals B/L; 1% lidocaine 1 mL per site; tolerated well, no complications",
    "TPI: B/L trapezius trigger points; 1% lidocaine 1 mL per site; tolerated well; post-procedure instructions given",
  ],
};

interface Stored {
  custom: string[];
  hiddenDefaults: string[];
}

function storageKey(cat: PhraseCategory): string {
  return `pimaster-phrases:${cat}`;
}

function load(cat: PhraseCategory): Stored {
  try {
    if (typeof localStorage === "undefined") return { custom: [], hiddenDefaults: [] };
    const raw = localStorage.getItem(storageKey(cat));
    if (!raw) return { custom: [], hiddenDefaults: [] };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return { custom: parsed.custom ?? [], hiddenDefaults: parsed.hiddenDefaults ?? [] };
  } catch {
    return { custom: [], hiddenDefaults: [] };
  }
}

function save(cat: PhraseCategory, s: Stored): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(storageKey(cat), JSON.stringify(s));
  } catch {
    // storage full/unavailable — the library just won't persist
  }
}

/** Defaults (minus any the physician hid) followed by the physician's own phrases. */
export function listPhrases(cat: PhraseCategory): string[] {
  const s = load(cat);
  return [...DEFAULT_PHRASES[cat].filter((p) => !s.hiddenDefaults.includes(p)), ...s.custom];
}

export function addPhrase(cat: PhraseCategory, text: string): void {
  const t = text.trim();
  if (!t) return;
  const s = load(cat);
  if (s.custom.includes(t) || DEFAULT_PHRASES[cat].includes(t)) return;
  save(cat, { ...s, custom: [...s.custom, t] });
}

/** Remove a custom phrase, or hide a default one. */
export function removePhrase(cat: PhraseCategory, text: string): void {
  const s = load(cat);
  if (s.custom.includes(text)) save(cat, { ...s, custom: s.custom.filter((p) => p !== text) });
  else if (DEFAULT_PHRASES[cat].includes(text)) save(cat, { ...s, hiddenDefaults: [...s.hiddenDefaults, text] });
}

/** Append a phrase to existing note text, one statement per line. */
export function appendPhrase(current: string, phrase: string): string {
  const cur = current.trimEnd();
  return cur ? `${cur}\n${phrase}` : phrase;
}
