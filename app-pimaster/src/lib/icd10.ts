import type { DxCode, VisitForm } from "./types";
import { impairedSides, JOINT_REGIONS, SPINE_REGION_IDS } from "./rom";

interface RegionDx {
  /** midline: single sprain code; limbs: per-side codes */
  sprain: { code: string; desc: string } | { R: DxCode; L: DxCode };
  /** paired strain code per the clinic's EMC certification coding convention */
  strain?: { code: string; desc: string } | { R: DxCode; L: DxCode };
  pain: { code: string; desc: string } | { R: DxCode; L: DxCode };
}

const ENC = ", initial encounter";

export const REGION_DX: Record<string, RegionDx> = {
  cervical: {
    sprain: { code: "S13.4XXA", desc: `Sprain of ligaments of cervical spine${ENC}` },
    strain: { code: "S16.1XXA", desc: `Strain of muscle, fascia and tendon at neck level${ENC}` },
    pain: { code: "M54.2", desc: "Cervicalgia" },
  },
  thoracic: {
    sprain: { code: "S23.3XXA", desc: `Sprain of ligaments of thoracic spine${ENC}` },
    strain: { code: "S29.012A", desc: `Strain of muscle and tendon of back wall of thorax${ENC}` },
    pain: { code: "M54.6", desc: "Pain in thoracic spine" },
  },
  lumbar: {
    sprain: { code: "S33.5XXA", desc: `Sprain of ligaments of lumbar spine${ENC}` },
    strain: { code: "S39.012A", desc: `Strain of muscle, fascia and tendon of lower back${ENC}` },
    pain: { code: "M54.50", desc: "Low back pain, unspecified" },
  },
  shoulder: {
    sprain: {
      R: { code: "S43.401A", desc: `Unspecified sprain of right shoulder joint${ENC}` },
      L: { code: "S43.402A", desc: `Unspecified sprain of left shoulder joint${ENC}` },
    },
    strain: {
      R: { code: "S46.011A", desc: `Strain of muscle(s) and tendon(s) of the rotator cuff of right shoulder${ENC}` },
      L: { code: "S46.012A", desc: `Strain of muscle(s) and tendon(s) of the rotator cuff of left shoulder${ENC}` },
    },
    pain: {
      R: { code: "M25.511", desc: "Pain in right shoulder" },
      L: { code: "M25.512", desc: "Pain in left shoulder" },
    },
  },
  elbow: {
    sprain: {
      R: { code: "S53.401A", desc: `Unspecified sprain of right elbow${ENC}` },
      L: { code: "S53.402A", desc: `Unspecified sprain of left elbow${ENC}` },
    },
    pain: {
      R: { code: "M25.521", desc: "Pain in right elbow" },
      L: { code: "M25.522", desc: "Pain in left elbow" },
    },
  },
  wrist: {
    sprain: {
      R: { code: "S63.501A", desc: `Unspecified sprain of right wrist${ENC}` },
      L: { code: "S63.502A", desc: `Unspecified sprain of left wrist${ENC}` },
    },
    strain: {
      R: { code: "S66.911A", desc: `Strain of unspecified muscle, fascia and tendon at wrist and hand level, right hand${ENC}` },
      L: { code: "S66.912A", desc: `Strain of unspecified muscle, fascia and tendon at wrist and hand level, left hand${ENC}` },
    },
    pain: {
      R: { code: "M25.531", desc: "Pain in right wrist" },
      L: { code: "M25.532", desc: "Pain in left wrist" },
    },
  },
  hip: {
    sprain: {
      R: { code: "S73.101A", desc: `Unspecified sprain of right hip${ENC}` },
      L: { code: "S73.102A", desc: `Unspecified sprain of left hip${ENC}` },
    },
    pain: {
      R: { code: "M25.551", desc: "Pain in right hip" },
      L: { code: "M25.552", desc: "Pain in left hip" },
    },
  },
  knee: {
    sprain: {
      R: { code: "S83.91XA", desc: `Sprain of unspecified site of right knee${ENC}` },
      L: { code: "S83.92XA", desc: `Sprain of unspecified site of left knee${ENC}` },
    },
    strain: {
      R: { code: "S86.811A", desc: `Strain of other muscle(s) and tendon(s) at lower leg level, right leg${ENC}` },
      L: { code: "S86.812A", desc: `Strain of other muscle(s) and tendon(s) at lower leg level, left leg${ENC}` },
    },
    pain: {
      R: { code: "M25.561", desc: "Pain in right knee" },
      L: { code: "M25.562", desc: "Pain in left knee" },
    },
  },
  ankle: {
    sprain: {
      R: { code: "S93.401A", desc: `Sprain of unspecified ligament of right ankle${ENC}` },
      L: { code: "S93.402A", desc: `Sprain of unspecified ligament of left ankle${ENC}` },
    },
    pain: {
      R: { code: "M25.571", desc: "Pain in right ankle and joints of right foot" },
      L: { code: "M25.572", desc: "Pain in left ankle and joints of left foot" },
    },
  },
};

export const PSYCH_CODES: DxCode[] = [
  { code: "F43.10", desc: "Post-traumatic stress disorder, unspecified" },
  { code: "F41.1", desc: "Generalized anxiety disorder" },
  { code: "F32.9", desc: "Major depressive disorder, single episode, unspecified" },
];

function isSided(v: RegionDx["sprain"]): v is { R: DxCode; L: DxCode } {
  return "R" in v;
}

export type ExamFindings = Pick<VisitForm, "romExam" | "spineExam" | "jointTenderness">;

/**
 * Auto-populate ICD-10 sprain + pain codes from documented exam findings:
 * functional maneuver impairment, spine tenderness/spasm/ROM, joint tenderness.
 */
export function deriveIcd10(findings: ExamFindings): DxCode[] {
  const out: DxCode[] = [];
  const regionIds = [...SPINE_REGION_IDS, ...JOINT_REGIONS.map((r) => r.id)];
  for (const regionId of regionIds) {
    const dx = REGION_DX[regionId];
    if (!dx) continue;
    const sides = impairedSides(regionId, findings);
    if (sides.length === 0) continue;
    if (!isSided(dx.sprain) || !isSided(dx.pain)) {
      out.push(dx.sprain as DxCode);
      if (dx.strain) out.push(dx.strain as DxCode);
      out.push(dx.pain as DxCode);
    } else {
      for (const side of ["R", "L"] as const) {
        if (sides.includes(side)) {
          out.push(dx.sprain[side]);
          if (dx.strain && isSided(dx.strain)) out.push(dx.strain[side]);
          out.push(dx.pain[side]);
        }
      }
    }
  }
  // de-duplicate by code
  const seen = new Set<string>();
  return out.filter((d) => (seen.has(d.code) ? false : (seen.add(d.code), true)));
}

/** Parse physician manual additions: one "CODE description" per line. */
export function parseManualCodes(text: string): DxCode[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [code, ...rest] = l.split(/\s+/);
      return { code: code.toUpperCase(), desc: rest.join(" ") };
    });
}
