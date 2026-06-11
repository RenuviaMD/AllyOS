import type { DxCode, RomExam } from "./types";
import { ROM_REGIONS, impairedSides } from "./rom";

interface RegionDx {
  /** midline: single sprain code; limbs: per-side codes */
  sprain: { code: string; desc: string } | { R: DxCode; L: DxCode };
  pain: { code: string; desc: string } | { R: DxCode; L: DxCode };
}

const ENC = ", initial encounter";

export const REGION_DX: Record<string, RegionDx> = {
  cervical: {
    sprain: { code: "S13.4XXA", desc: `Sprain of ligaments of cervical spine${ENC}` },
    pain: { code: "M54.2", desc: "Cervicalgia" },
  },
  thoracic: {
    sprain: { code: "S23.3XXA", desc: `Sprain of ligaments of thoracic spine${ENC}` },
    pain: { code: "M54.6", desc: "Pain in thoracic spine" },
  },
  lumbar: {
    sprain: { code: "S33.5XXA", desc: `Sprain of ligaments of lumbar spine${ENC}` },
    pain: { code: "M54.50", desc: "Low back pain, unspecified" },
  },
  shoulder: {
    sprain: {
      R: { code: "S43.401A", desc: `Unspecified sprain of right shoulder joint${ENC}` },
      L: { code: "S43.402A", desc: `Unspecified sprain of left shoulder joint${ENC}` },
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
    pain: {
      R: { code: "M25.531", desc: "Pain in right wrist" },
      L: { code: "M25.532", desc: "Pain in left wrist" },
    },
  },
  hand: {
    sprain: {
      R: { code: "S63.8X1A", desc: `Sprain of other part of right wrist and hand${ENC}` },
      L: { code: "S63.8X2A", desc: `Sprain of other part of left wrist and hand${ENC}` },
    },
    pain: {
      R: { code: "M79.641", desc: "Pain in right hand" },
      L: { code: "M79.642", desc: "Pain in left hand" },
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

/** Auto-populate ICD-10 sprain/strain + pain codes from ROM impairment. */
export function deriveIcd10(rom: RomExam): DxCode[] {
  const out: DxCode[] = [];
  for (const region of ROM_REGIONS) {
    const dx = REGION_DX[region.id];
    if (!dx) continue;
    const sides = impairedSides(region.id, rom);
    if (sides.length === 0) continue;
    if (!isSided(dx.sprain) || !isSided(dx.pain)) {
      out.push(dx.sprain as DxCode, dx.pain as DxCode);
    } else {
      for (const side of ["R", "L"] as const) {
        if (sides.includes(side)) {
          out.push(dx.sprain[side], dx.pain[side]);
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
