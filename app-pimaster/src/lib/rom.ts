import type { RomExam, RomGrade } from "./types";

export type Side = "R" | "L" | null;

export interface Movement {
  id: string;
  label: string;
  side: Side;
  motion: string;
  /** AAOS normal range in degrees (approximate functional mapping) */
  normalDeg: number;
}

export interface RomRegion {
  id: string;
  label: string;
  movements: Movement[];
}

function bilateral(idBase: string, label: string, motion: string, normalDeg: number): Movement[] {
  return [
    { id: `${idBase}-R`, label: `${label} (Right)`, side: "R", motion, normalDeg },
    { id: `${idBase}-L`, label: `${label} (Left)`, side: "L", motion, normalDeg },
  ];
}

export const ROM_REGIONS: RomRegion[] = [
  {
    id: "cervical",
    label: "Cervical Spine",
    movements: [
      { id: "cervical-flex", label: "Chin to Chest", side: null, motion: "Flexion", normalDeg: 50 },
      { id: "cervical-ext", label: "Look at Ceiling", side: null, motion: "Extension", normalDeg: 60 },
      { id: "cervical-latR", label: "Ear to Shoulder (Right)", side: null, motion: "Lateral Flexion R", normalDeg: 45 },
      { id: "cervical-latL", label: "Ear to Shoulder (Left)", side: null, motion: "Lateral Flexion L", normalDeg: 45 },
      { id: "cervical-rotR", label: "Look Over Shoulder (Right)", side: null, motion: "Rotation R", normalDeg: 80 },
      { id: "cervical-rotL", label: "Look Over Shoulder (Left)", side: null, motion: "Rotation L", normalDeg: 80 },
    ],
  },
  {
    id: "thoracic",
    label: "Thoracic Spine",
    movements: [
      { id: "thoracic-flex", label: "Flexion", side: null, motion: "Flexion", normalDeg: 45 },
      { id: "thoracic-ext", label: "Extension", side: null, motion: "Extension", normalDeg: 25 },
    ],
  },
  {
    id: "lumbar",
    label: "Lumbar Spine",
    movements: [
      { id: "lumbar-flex", label: "Fingertip to Floor", side: null, motion: "Flexion", normalDeg: 60 },
      { id: "lumbar-ext", label: "Backward Lean", side: null, motion: "Extension", normalDeg: 25 },
      { id: "lumbar-latR", label: "Side Bend (Right)", side: null, motion: "Lateral Flexion R", normalDeg: 25 },
      { id: "lumbar-latL", label: "Side Bend (Left)", side: null, motion: "Lateral Flexion L", normalDeg: 25 },
    ],
  },
  {
    id: "shoulder",
    label: "Shoulders",
    movements: [
      ...bilateral("shoulder-raise", "Raise Overhead", "Flexion", 180),
      ...bilateral("shoulder-behindhead", "Reach Behind Head", "External Rotation", 90),
      ...bilateral("shoulder-tuck", "Tuck in Shirt", "Internal Rotation", 70),
    ],
  },
  {
    id: "elbow",
    label: "Elbows",
    movements: [
      ...bilateral("elbow-touch", "Touch Shoulder", "Flexion", 150),
      ...bilateral("elbow-doorknob", "Turn Doorknob", "Supination/Pronation", 80),
    ],
  },
  {
    id: "wrist",
    label: "Wrists",
    movements: [
      ...bilateral("wrist-back", "Bend Back", "Extension", 70),
      ...bilateral("wrist-fwd", "Bend Forward", "Flexion", 80),
    ],
  },
  {
    id: "hand",
    label: "Hands",
    movements: [
      ...bilateral("hand-fist", "Make Fist", "Composite Flexion", 90),
      ...bilateral("hand-pinch", "Pinch Test", "Opposition", 90),
    ],
  },
  {
    id: "hip",
    label: "Hips",
    movements: [
      ...bilateral("hip-car", "Get in Car", "Flexion", 120),
      ...bilateral("hip-side", "Step Sideways", "Abduction", 45),
    ],
  },
  {
    id: "knee",
    label: "Knees",
    movements: [
      ...bilateral("knee-chair", "Rise from Chair", "Flexion", 135),
      ...bilateral("knee-stepup", "Step Up", "Flexion (loaded)", 135),
    ],
  },
  {
    id: "ankle",
    label: "Ankles",
    movements: [
      ...bilateral("ankle-heeltoe", "Heel-Toe Walk", "Dorsiflexion", 20),
      ...bilateral("ankle-tiptoe", "Stand on Tiptoes", "Plantarflexion", 50),
      ...bilateral("ankle-rollin", "Ankle Roll In", "Inversion", 35),
      ...bilateral("ankle-rollout", "Ankle Roll Out", "Eversion", 15),
    ],
  },
];

export const GRADE_LABELS: Record<Exclude<RomGrade, "">, string> = {
  full: "Full",
  partial: "Partial",
  limited: "Limited",
  cannot: "Cannot",
};

/** Fraction of AAOS normal range mapped from the 4-point functional scale. */
export const GRADE_FRACTION: Record<Exclude<RomGrade, "">, number> = {
  full: 1.0,
  partial: 0.65,
  limited: 0.35,
  cannot: 0.1,
};

/** Map a functional grade to estimated AAOS degrees for a movement. */
export function estimateDegrees(movement: Movement, grade: RomGrade): number | null {
  if (!grade) return null;
  return Math.round(movement.normalDeg * GRADE_FRACTION[grade]);
}

export function isImpaired(grade: RomGrade): boolean {
  return grade === "partial" || grade === "limited" || grade === "cannot";
}

/** Sides impaired for a region: midline regions return [null]; limbs return affected sides. */
export function impairedSides(regionId: string, rom: RomExam): Side[] {
  const region = ROM_REGIONS.find((r) => r.id === regionId);
  if (!region) return [];
  const sides = new Set<Side>();
  for (const m of region.movements) {
    if (isImpaired(rom[m.id] ?? "")) sides.add(m.side);
  }
  return [...sides];
}
