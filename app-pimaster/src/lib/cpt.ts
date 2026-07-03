export interface CptItem {
  cpt: string;
  name: string;
  desc?: string;
}

export const EM_LEVELS = [
  { code: "99205", label: "99205 — New patient, high complexity" },
  { code: "99204", label: "99204 — New patient, moderate complexity" },
  { code: "99214", label: "99214 — Established patient, moderate complexity" },
  { code: "99215", label: "99215 — Established patient, high complexity" },
];

export const PT_MODALITIES: CptItem[] = [
  { cpt: "97010", name: "Hot/Cold Pack", desc: "Application of hot or cold packs" },
  { cpt: "97035", name: "Ultrasound", desc: "Therapeutic ultrasound" },
  { cpt: "97110", name: "Therapeutic Exercise", desc: "Strength, endurance, ROM, flexibility" },
  { cpt: "97140", name: "Manual Therapy", desc: "Mobilization, manipulation, manual traction" },
  { cpt: "97530", name: "Therapeutic Activities", desc: "Dynamic activities to improve function" },
  { cpt: "97012", name: "Mechanical Traction", desc: "Traction, mechanical" },
  { cpt: "97014", name: "E-Stim Unattended", desc: "Electrical stimulation, unattended" },
  { cpt: "97018", name: "Paraffin Bath", desc: "Paraffin bath therapy" },
  { cpt: "97032", name: "E-Stim Attended", desc: "Electrical stimulation, manual, attended" },
  { cpt: "97112", name: "Neuromuscular Re-education", desc: "Movement, balance, coordination, posture" },
  { cpt: "97116", name: "Gait Training", desc: "Gait training therapy" },
];

export const PT_FREQUENCIES = ["5x/week", "4x/week", "3x/week", "2x/week", "Daily", "PRN"];
export const PT_DURATIONS = ["4 weeks", "6 weeks", "8 weeks", "12 weeks"];
export const FOLLOW_UPS = ["2 weeks", "1 week", "3 weeks", "4 weeks", "PRN"];

export interface ImagingItem {
  id: string;
  label: string;
  cpt: string;
  sided?: boolean;
}

export interface ImagingGroup {
  id: string;
  label: string;
  items: ImagingItem[];
}

/** X-ray catalog per spec — NO skull section. */
export const IMAGING_GROUPS: ImagingGroup[] = [
  {
    id: "spine",
    label: "Spine",
    items: [
      { id: "spine-cervical", label: "Cervical Spine", cpt: "72040" },
      { id: "spine-thoracic", label: "Thoracic Spine", cpt: "72070" },
      { id: "spine-lumbar", label: "Lumbar Spine", cpt: "72100" },
      { id: "spine-sacral", label: "Sacrum", cpt: "72220" },
      { id: "spine-coccyx", label: "Coccyx", cpt: "72220" },
    ],
  },
  {
    id: "pelvis",
    label: "Pelvis",
    items: [
      { id: "pelvis-pelvis", label: "Pelvis", cpt: "72170" },
      { id: "pelvis-hip", label: "Hip", cpt: "73502", sided: true },
    ],
  },
  {
    id: "chest",
    label: "Chest",
    items: [
      { id: "chest-chest", label: "Chest", cpt: "71046" },
      { id: "chest-ribs", label: "Ribs", cpt: "71100", sided: true },
      { id: "chest-clavicle", label: "Clavicle", cpt: "73000", sided: true },
      { id: "chest-sternum", label: "Sternum", cpt: "71120" },
    ],
  },
  {
    id: "upper",
    label: "Upper Extremities",
    items: [
      { id: "upper-shoulder", label: "Shoulder", cpt: "73030", sided: true },
      { id: "upper-humerus", label: "Humerus", cpt: "73060", sided: true },
      { id: "upper-elbow", label: "Elbow", cpt: "73070", sided: true },
      { id: "upper-forearm", label: "Forearm", cpt: "73090", sided: true },
      { id: "upper-wrist", label: "Wrist", cpt: "73100", sided: true },
      { id: "upper-hand", label: "Hand", cpt: "73120", sided: true },
      { id: "upper-fingers", label: "Thumb/Fingers", cpt: "73140", sided: true },
    ],
  },
  {
    id: "lower",
    label: "Lower Extremities",
    items: [
      { id: "lower-femur", label: "Femur", cpt: "73552", sided: true },
      { id: "lower-knee", label: "Knee", cpt: "73560", sided: true },
      { id: "lower-tibfib", label: "Tibia/Fibula", cpt: "73590", sided: true },
      { id: "lower-ankle", label: "Ankle", cpt: "73600", sided: true },
      { id: "lower-calcaneus", label: "Calcaneus", cpt: "73650", sided: true },
      { id: "lower-foot", label: "Foot", cpt: "73620", sided: true },
      { id: "lower-toes", label: "Toes", cpt: "73660", sided: true },
    ],
  },
];

/** In-office procedures (MD-performed) for the fee schedule. */
export const PROCEDURES: CptItem[] = [
  { cpt: "20552", name: "Trigger point injection, 1 or 2 muscles" },
  { cpt: "20553", name: "Trigger point injection, 3 or more muscles" },
];

/** Advanced imaging (MRI / CT / US) — standard w/o-contrast codes for the fee schedule. */
export const ADVANCED_IMAGING: CptItem[] = [
  { cpt: "70551", name: "MRI Brain (w/o contrast)" },
  { cpt: "72141", name: "MRI Cervical Spine (w/o contrast)" },
  { cpt: "72146", name: "MRI Thoracic Spine (w/o contrast)" },
  { cpt: "72148", name: "MRI Lumbar Spine (w/o contrast)" },
  { cpt: "73221", name: "MRI Upper Extremity Joint — Shoulder/Elbow/Wrist (w/o contrast)" },
  { cpt: "73721", name: "MRI Lower Extremity Joint — Hip/Knee/Ankle (w/o contrast)" },
  { cpt: "70450", name: "CT Head/Brain (w/o contrast)" },
  { cpt: "72125", name: "CT Cervical Spine (w/o contrast)" },
  { cpt: "72128", name: "CT Thoracic Spine (w/o contrast)" },
  { cpt: "72131", name: "CT Lumbar Spine (w/o contrast)" },
  { cpt: "76536", name: "Ultrasound Soft Tissue Head/Neck (diagnostic)" },
  { cpt: "76700", name: "Ultrasound Abdomen, complete (diagnostic)" },
  { cpt: "76881", name: "Ultrasound Extremity Joint, complete (diagnostic)" },
];

/** X-ray catalog flattened for the fee schedule — one row per CPT (Sacrum/Coccyx share 72220). */
export function xrayFeeItems(): CptItem[] {
  const byCpt = new Map<string, string[]>();
  for (const g of IMAGING_GROUPS) {
    for (const item of g.items) {
      const labels = byCpt.get(item.cpt) ?? [];
      if (!labels.includes(item.label)) labels.push(item.label);
      byCpt.set(item.cpt, labels);
    }
  }
  return [...byCpt.entries()].map(([cpt, labels]) => ({ cpt, name: `X-Ray — ${labels.join(" / ")}` }));
}

export const OTHER_IMAGING_REGIONS = [
  "Cervical Spine",
  "Thoracic Spine",
  "Lumbar Spine",
  "Brain",
  "Shoulder (R)",
  "Shoulder (L)",
  "Knee (R)",
  "Knee (L)",
  "Hip (R)",
  "Hip (L)",
  "Abdomen",
  "Soft Tissue",
];

/** Resolve a selection id like "upper-shoulder-R" or "spine-cervical" to its item + side. */
export function resolveImagingSelection(
  sel: string,
): { item: ImagingItem; side: "R" | "L" | null } | null {
  const sideMatch = sel.match(/-(R|L)$/);
  const side = (sideMatch?.[1] as "R" | "L" | undefined) ?? null;
  const baseId = side ? sel.slice(0, -2) : sel;
  for (const g of IMAGING_GROUPS) {
    const item = g.items.find((i) => i.id === baseId);
    if (item) return { item, side };
  }
  return null;
}
