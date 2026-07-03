import type { RomGrade, SpineExam, VisitForm } from "./types";

export type Side = "R" | "L" | null;

export interface Maneuver {
  id: string;
  label: string;
  icon: string;
  /** verbal instruction read to the patient (works in person or over video) */
  script: string;
  /** reference only — never recorded as a measurement */
  normalLabel: string;
  side: Side;
}

export interface ExamRegion {
  id: string;
  label: string;
  kind: "spine" | "joint";
  maneuvers: Maneuver[];
}

function m(id: string, icon: string, label: string, script: string, normalLabel: string, side: Side = null): Maneuver {
  return { id, icon, label, script, normalLabel, side };
}

export const SPINE_REGION_IDS = ["cervical", "thoracic", "lumbar"] as const;
export type SpineRegionId = (typeof SPINE_REGION_IDS)[number];
export const SPINE_REGION_LABELS: Record<SpineRegionId, string> = {
  cervical: "Cervical",
  thoracic: "Thoracic",
  lumbar: "Lumbar",
};

export const EXAM_REGIONS: ExamRegion[] = [
  {
    id: "cervical",
    label: "Cervical Spine",
    kind: "spine",
    maneuvers: [
      m("cervical-flex", "⬇", "Chin to Chest", "Look down — touch chin to chest.", "~50°"),
      m("cervical-ext", "⬆", "Look at Ceiling", "Look up at the ceiling.", "~60°"),
      m("cervical-latR", "➡", "Ear to Shoulder (R)", "Touch right ear to right shoulder.", "~45°", "R"),
      m("cervical-latL", "⬅", "Ear to Shoulder (L)", "Touch left ear to left shoulder.", "~45°", "L"),
      m("cervical-rotR", "↩", "Look Over Shoulder (R)", "Turn head — look over right shoulder.", "~70°", "R"),
      m("cervical-rotL", "↪", "Look Over Shoulder (L)", "Turn head — look over left shoulder.", "~70°", "L"),
    ],
  },
  {
    id: "lumbar",
    label: "Lumbar Spine",
    kind: "spine",
    maneuvers: [
      m("lumbar-flex", "🧎", "Fingertip to Floor", "Slowly bend forward — reach toward floor.", "~60°"),
      m("lumbar-ext", "🧍", "Backward Lean", "Hands on hips — lean backward.", "~25°"),
      m("lumbar-latR", "◣", "Side Bend Right", "Slide right hand down right leg.", "~25°", "R"),
      m("lumbar-latL", "◢", "Side Bend Left", "Slide left hand down left leg.", "~25°", "L"),
    ],
  },
  {
    id: "shoulder",
    label: "Shoulder (R / L)",
    kind: "joint",
    maneuvers: [
      m("shoulder-raiseR", "🙌", "Raise Arm Overhead R", "Raise right arm straight overhead.", "~180°", "R"),
      m("shoulder-raiseL", "🙌", "Raise Arm Overhead L", "Raise left arm straight overhead.", "~180°", "L"),
      m("shoulder-behindR", "↗", "Reach Behind Head R", "Touch back of neck with right hand.", "~90° ER", "R"),
      m("shoulder-behindL", "↖", "Reach Behind Head L", "Touch back of neck with left hand.", "~90° ER", "L"),
      m("shoulder-tuckR", "🔒", "Tuck In Shirt R (IR)", "Touch right hand to small of back.", "~70° IR", "R"),
      m("shoulder-tuckL", "🔒", "Tuck In Shirt L (IR)", "Touch left hand to small of back.", "~70° IR", "L"),
    ],
  },
  {
    id: "elbow",
    label: "Elbow (R / L)",
    kind: "joint",
    maneuvers: [
      m("elbow-touchR", "💪", "Touch Own Shoulder R", "Bend right elbow — touch right shoulder.", "~145°", "R"),
      m("elbow-touchL", "💪", "Touch Own Shoulder L", "Bend left elbow — touch left shoulder.", "~145°", "L"),
      m("elbow-knobR", "🔄", "Turn Doorknob R", "Right palm up, then palm down.", "~90° each", "R"),
      m("elbow-knobL", "🔄", "Turn Doorknob L", "Left palm up, then palm down.", "~90° each", "L"),
    ],
  },
  {
    id: "wrist",
    label: "Wrist (R / L)",
    kind: "joint",
    maneuvers: [
      m("wrist-backR", "⬆", "Bend Wrist Back R", "Right hand back — bend wrist backward.", "~70°", "R"),
      m("wrist-backL", "⬆", "Bend Wrist Back L", "Left hand back — bend wrist backward.", "~70°", "L"),
      m("wrist-fwdR", "⬇", "Bend Wrist Forward R", "Right palm — curl wrist forward.", "~80°", "R"),
      m("wrist-fwdL", "⬇", "Bend Wrist Forward L", "Left palm — curl wrist forward.", "~80°", "L"),
    ],
  },
  {
    id: "hip",
    label: "Hip (R / L)",
    kind: "joint",
    maneuvers: [
      m("hip-flexR", "🦵", "Flex Hip R", "Bring right knee to chest.", "~120°", "R"),
      m("hip-flexL", "🦵", "Flex Hip L", "Bring left knee to chest.", "~120°", "L"),
    ],
  },
  {
    id: "knee",
    label: "Knee (R / L)",
    kind: "joint",
    maneuvers: [
      m("knee-chairR", "🪑", "Rise from Chair R", "Sit — now stand without using hands.", "~135°", "R"),
      m("knee-chairL", "🪑", "Rise from Chair L", "Repeat — assess left knee.", "~135°", "L"),
      m("knee-stepR", "🪜", "Step Up Right", "Step up onto this step — right leg.", "Stable", "R"),
      m("knee-stepL", "🪜", "Step Up Left", "Step up onto this step — left leg.", "Stable", "L"),
    ],
  },
  {
    id: "ankle",
    label: "Ankle / Foot (R / L)",
    kind: "joint",
    maneuvers: [
      m("ankle-walkR", "🦶", "Heel-Toe Walk R", "Walk heel-to-toe across the room.", "~20° DF", "R"),
      m("ankle-walkL", "🦶", "Heel-Toe Walk L", "Same — assess left ankle.", "~20° DF", "L"),
      m("ankle-tipR", "🦶", "Stand on Tiptoes R", "Rise up on your right tiptoes.", "~50° PF", "R"),
      m("ankle-tipL", "🦶", "Stand on Tiptoes L", "Rise up on your left tiptoes.", "~50° PF", "L"),
      m("ankle-rollR", "🔄", "Ankle Roll In/Out R", "Roll right ankle in, then out.", "±30°", "R"),
      m("ankle-rollL", "🔄", "Ankle Roll In/Out L", "Roll left ankle in, then out.", "±30°", "L"),
    ],
  },
];

export const JOINT_REGIONS = EXAM_REGIONS.filter((r) => r.kind === "joint");

export const GRADE_LABELS: Record<Exclude<RomGrade, "">, string> = {
  wnl: "WNL",
  limited: "Limited",
  cannot: "Cannot perform",
};

export function isImpaired(grade: RomGrade): boolean {
  return grade === "limited" || grade === "cannot";
}

/**
 * Sides impaired for a region, from any source of findings:
 * functional maneuvers, spine table (tenderness/spasm/ROM), or joint tenderness.
 * Midline spine regions return [null]; joints return affected sides.
 */
export function impairedSides(regionId: string, form: Pick<VisitForm, "romExam" | "spineExam" | "jointTenderness">): Side[] {
  if ((SPINE_REGION_IDS as readonly string[]).includes(regionId)) {
    const row = form.spineExam[regionId as SpineRegionId];
    const region = EXAM_REGIONS.find((r) => r.id === regionId);
    const maneuverImpaired = region?.maneuvers.some((mv) => isImpaired(form.romExam[mv.id] ?? "")) ?? false;
    const tableImpaired = row && (row.tenderness === "yes" || row.spasm === "yes" || isImpaired(row.rom));
    return maneuverImpaired || tableImpaired ? [null] : [];
  }
  const region = EXAM_REGIONS.find((r) => r.id === regionId);
  if (!region) return [];
  const sides = new Set<Side>();
  for (const mv of region.maneuvers) {
    if (isImpaired(form.romExam[mv.id] ?? "")) sides.add(mv.side);
  }
  const tend = form.jointTenderness[regionId];
  if (tend?.R === "yes") sides.add("R");
  if (tend?.L === "yes") sides.add("L");
  sides.delete(null);
  return [...sides];
}

export function emptySpineExam(): SpineExam {
  return {
    cervical: { tenderness: "", spasm: "", rom: "" },
    thoracic: { tenderness: "", spasm: "", rom: "" },
    lumbar: { tenderness: "", spasm: "", rom: "" },
  };
}
