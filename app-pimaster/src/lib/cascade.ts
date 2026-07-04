import type { Complaint, DxCode, VisitForm } from "./types";

/**
 * Complaint-driven encounter cascade — the governing workflow concept
 * (Dr. Falcon, 2026-07-04): the physician enters the COMPLAINT (region +
 * laterality + pain), and the platform generates the entire region thread —
 * ICD-10 codes with laterality + initial-encounter suffix, the imaging order,
 * the PT prescription, and the AI narrative facts. Region in → everything out.
 *
 * Nothing is invented: every output derives deterministically from the
 * physician's entered complaint, using his locked code maps
 * (prompts/initial-eval-*.md). The physician reviews and can remove any
 * derived item; regions without a complaint produce nothing.
 */

export interface RegionDef {
  id: string;
  label: string;
  sided: boolean;
  /** dx builders — codes per side ("" for unsided regions) */
  dx: (side: "R" | "L" | "") => DxCode[];
  /** IMAGING_GROUPS selection id (side appended for sided regions) */
  imagingId: string | null;
  /** default PT modalities (CPT) — physician adjusts */
  pt: string[];
}

const ENC = ", initial encounter";

export const CASCADE_REGIONS: RegionDef[] = [
  {
    id: "head",
    label: "Head / Headache",
    sided: false,
    dx: () => [{ code: "G44.319", desc: "Acute post-traumatic headache, not intractable" }],
    imagingId: null, // no skull films per spec
    pt: [],
  },
  {
    id: "cervical",
    label: "Cervical Spine",
    sided: false,
    dx: () => [
      { code: "S13.4XXA", desc: `Sprain of ligaments of cervical spine${ENC}` },
      { code: "S16.1XXA", desc: `Strain of muscle, fascia and tendon at neck level${ENC}` },
      { code: "M54.2", desc: "Cervicalgia" },
    ],
    imagingId: "spine-cervical",
    pt: ["97110", "97140"],
  },
  {
    id: "thoracic",
    label: "Thoracic Spine",
    sided: false,
    dx: () => [
      { code: "S23.3XXA", desc: `Sprain of ligaments of thoracic spine${ENC}` },
      { code: "S29.012A", desc: `Strain of muscle and tendon of back wall of thorax${ENC}` },
      { code: "M54.6", desc: "Pain in thoracic spine" },
    ],
    imagingId: "spine-thoracic",
    pt: ["97110", "97140"],
  },
  {
    id: "lumbar",
    label: "Lumbar Spine",
    sided: false,
    dx: () => [
      { code: "S33.5XXA", desc: `Sprain of ligaments of lumbar spine${ENC}` },
      { code: "S39.012A", desc: `Strain of muscle, fascia and tendon of lower back${ENC}` },
      { code: "M54.50", desc: "Low back pain, unspecified" },
    ],
    imagingId: "spine-lumbar",
    pt: ["97110", "97140"],
  },
  {
    id: "shoulder",
    label: "Shoulder",
    sided: true,
    dx: (s) => [
      s === "L"
        ? { code: "S43.402A", desc: `Unspecified sprain of left shoulder joint${ENC}` }
        : { code: "S43.401A", desc: `Unspecified sprain of right shoulder joint${ENC}` },
      s === "L" ? { code: "M25.512", desc: "Pain in left shoulder" } : { code: "M25.511", desc: "Pain in right shoulder" },
    ],
    imagingId: "upper-shoulder",
    pt: ["97110", "97140"],
  },
  {
    id: "elbow",
    label: "Elbow",
    sided: true,
    dx: (s) => [
      s === "L"
        ? { code: "S53.402A", desc: `Unspecified sprain of left elbow${ENC}` }
        : { code: "S53.401A", desc: `Unspecified sprain of right elbow${ENC}` },
      s === "L" ? { code: "M25.522", desc: "Pain in left elbow" } : { code: "M25.521", desc: "Pain in right elbow" },
    ],
    imagingId: "upper-elbow",
    pt: ["97110", "97140"],
  },
  {
    id: "wrist",
    label: "Wrist",
    sided: true,
    dx: (s) => [
      s === "L"
        ? { code: "S63.502A", desc: `Unspecified sprain of left wrist${ENC}` }
        : { code: "S63.501A", desc: `Unspecified sprain of right wrist${ENC}` },
      s === "L" ? { code: "M25.532", desc: "Pain in left wrist" } : { code: "M25.531", desc: "Pain in right wrist" },
    ],
    imagingId: "upper-wrist",
    pt: ["97110", "97140"],
  },
  {
    id: "knee",
    label: "Knee",
    sided: true,
    dx: (s) => [
      s === "L"
        ? { code: "S83.92XA", desc: `Sprain of unspecified site of left knee${ENC}` }
        : { code: "S83.91XA", desc: `Sprain of unspecified site of right knee${ENC}` },
      s === "L" ? { code: "M25.562", desc: "Pain in left knee" } : { code: "M25.561", desc: "Pain in right knee" },
    ],
    imagingId: "lower-knee",
    pt: ["97110", "97140"],
  },
  {
    id: "ankle",
    label: "Ankle",
    sided: true,
    dx: (s) => [
      s === "L"
        ? { code: "S93.402A", desc: `Sprain of unspecified ligament of left ankle${ENC}` }
        : { code: "S93.401A", desc: `Sprain of unspecified ligament of right ankle${ENC}` },
      s === "L" ? { code: "M25.572", desc: "Pain in left ankle" } : { code: "M25.571", desc: "Pain in right ankle" },
    ],
    imagingId: "lower-ankle",
    pt: ["97110", "97140"],
  },
];

const SIDE_WORD: Record<string, string> = { R: "right", L: "left", B: "bilateral", "": "" };

export interface CascadeResult {
  extraCodes: DxCode[];
  imagingSelected: string[];
  modalities: string[];
  hpiSeed: string;
  summary: string[];
}

/** Expand a complaint's sides: unsided → [""], R/L → one, B → both. */
function sidesOf(def: RegionDef, c: Complaint): ("R" | "L" | "")[] {
  if (!def.sided) return [""];
  if (c.side === "B") return ["R", "L"];
  return [c.side === "L" ? "L" : "R"];
}

/** Derive the full region thread from the entered complaints. Deterministic;
 * merges with what the physician already selected (never removes). */
export function buildCascade(form: VisitForm): CascadeResult {
  const complaints = (form.complaints ?? []).filter((c) => c.region);
  const codes = new Map<string, DxCode>();
  const imaging = new Set<string>(form.imaging.selected);
  const modalities = new Set<string>(form.plan.modalities);
  const hpiLines: string[] = [];
  const summary: string[] = [];

  for (const c of complaints) {
    const def = CASCADE_REGIONS.find((r) => r.id === c.region);
    if (!def) continue;
    const sides = sidesOf(def, c);
    const sideWord = def.sided ? SIDE_WORD[c.side || "R"] : "";
    for (const s of sides) {
      for (const d of def.dx(s)) codes.set(d.code, d);
      if (def.imagingId) imaging.add(def.sided ? `${def.imagingId}-${s}` : def.imagingId);
    }
    def.pt.forEach((cpt) => modalities.add(cpt));
    const label = `${sideWord ? sideWord + " " : ""}${def.label.toLowerCase()}`;
    hpiLines.push(`${label}: pain${c.pain ? ` ${c.pain}/10` : ""}${c.note ? ` — ${c.note}` : ""}`);
    summary.push(label);
  }

  // merge with existing physician-selected extra codes (never remove)
  for (const d of form.assessment.extraCodes ?? []) codes.set(d.code, d);

  return {
    extraCodes: [...codes.values()],
    imagingSelected: [...imaging],
    modalities: [...modalities],
    hpiSeed: hpiLines.join("\n"),
    summary,
  };
}
