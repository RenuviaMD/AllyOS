export type VisitType = "initial" | "followup" | "final";
export type VisitMode = "inPerson" | "telehealth";
export type Role = "staff" | "physician" | "pt";
export type YesNo = "" | "yes" | "no";
/** 3-point functional scale: WNL / Limited / Cannot perform */
export type RomGrade = "" | "wnl" | "limited" | "cannot";

export interface PatientInfo {
  firstName: string;
  lastName: string;
  dob: string;
  sex: "" | "male" | "female" | "other";
  insuranceCarrier: string;
  policyNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface AccidentInfo {
  accidentDate: string;
  accidentType: "" | "MVA" | "Work" | "Fall" | "Sports" | "Other";
  ticketed: YesNo;
  role: "" | "Driver" | "Passenger" | "Pedestrian" | "Other";
  seatbelt: YesNo;
  airbag: YesNo;
  vehicleDrivable: YesNo;
  priorMedical: YesNo;
}

export interface Pmh {
  previousAccidents: YesNo;
  surgeries: YesNo;
  allergies: YesNo;
  alcohol: YesNo;
  smoking: YesNo;
  drugs: YesNo;
  medications: YesNo;
  hypertension: YesNo;
  diabetes: YesNo;
  heartDisease: YesNo;
  aggravatedPrevious: YesNo;
  previousConditionDx: string;
  lmp: string;
  pregnant: "" | "yes" | "no" | "na";
}

export interface GeneralExam {
  bp: string;
  pulse: string;
  resp: string;
  temp: string;
  appearance: string;
  posture: string;
  mood: string;
  cognition: string;
}

/** movementId -> grade */
export type RomExam = Record<string, RomGrade>;

export interface SpineRegionExam {
  tenderness: YesNo;
  spasm: YesNo;
  rom: RomGrade;
}

export type SpineExam = Record<"cervical" | "thoracic" | "lumbar", SpineRegionExam>;

/** jointRegionId -> per-side tenderness (hands-on finding; in-person only) */
export type JointTenderness = Record<string, { R: YesNo; L: YesNo }>;

export interface TelehealthInfo {
  consentObtained: boolean;
  consentBy: string;
  /** initial/final visits default to in-person; telehealth requires a documented reason */
  overrideReason: string;
}

export interface DxCode {
  code: string;
  desc: string;
}

export interface Assessment {
  /** auto-populated from ROM; physician may remove */
  autoCodes: DxCode[];
  /** physician-selected additions from the clinic dx catalog */
  extraCodes: DxCode[];
  /** F43.10 / F41.1 / F32.9 */
  psych: string[];
  /** manual additions, one "CODE description" per line */
  manual: string;
}

export interface TreatmentPlan {
  emLevel: string;
  medicalNecessity: string;
  ptFrequency: string;
  ptDuration: string;
  modalities: string[]; // CPT codes
  followUp: string;
  /** Emergency Medical Condition determination (FL PIP) — required on initial visits */
  emc: "" | "yes" | "no" | "deferred";
  /** physician's causation opinion — drives the Causation Statement */
  causation: "" | "related" | "not-related" | "undetermined";
  prognosis: "" | "Excellent" | "Good" | "Fair" | "Guarded" | "Poor";
}

export interface ImageOrders {
  /** imaging item ids, e.g. "spine-cervical", "shoulder-R" */
  selected: string[];
  mriRegion: string;
  ctRegion: string;
  usRegion: string;
}

export interface ReviewedImage {
  name: string;
  reviewed: boolean;
}

export interface ImagingReview {
  images: ReviewedImage[];
  findings: string;
  discussed: YesNo;
}

export interface Discharge {
  outcome: "" | "Full" | "Significant" | "Moderate" | "Minimal" | "None";
  returnToWork: "" | "Full Duty" | "Modified" | "Unable" | "On Leave";
  returnToActivities: "" | "Full" | "Partial" | "Limited" | "None";
  residualIssues: YesNo;
  residualNote: string;
  sequelae: string;
  continuedCare: YesNo;
  continuedCareNote: string;
}

export interface PtDaily {
  sessionType: "" | "Treatment" | "Assessment" | "Education" | "Exercise";
  painLevel: string;
  compliance: "" | "Poor" | "Fair" | "Good" | "Excellent";
  treatments: string[]; // CPT codes
  progress: "" | "Regressing" | "Same" | "Improving" | "Significantly";
  modifications: YesNo;
  modificationsNote: string;
  homework: YesNo;
  homeworkNote: string;
}

export interface PtWeekly {
  overallProgress: "" | "Regressing" | "Plateau" | "Improving" | "Significantly";
  sessionsAttended: string;
  compliancePct: string;
  functionalImprovements: YesNo;
  functionalNote: string;
  painTrend: "" | "Decreasing" | "Stable" | "Increasing";
  planNextWeek: string;
  /** day-by-day pain/progress notes keyed by ISO date */
  dayNotes: Record<string, { pain: string; note: string }>;
}

export interface VisitForm {
  visitType: VisitType;
  visitMode: VisitMode;
  visitDate: string;
  telehealth: TelehealthInfo;
  patient: PatientInfo;
  accident: AccidentInfo;
  pmh: Pmh;
  gen: GeneralExam;
  romExam: RomExam;
  spineExam: SpineExam;
  jointTenderness: JointTenderness;
  assessment: Assessment;
  plan: TreatmentPlan;
  imaging: ImageOrders;
  imagingReview: ImagingReview;
  discharge: Discharge;
  ptDaily: PtDaily;
  ptWeekly: PtWeekly;
}

export function emptyForm(): VisitForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    visitType: "initial",
    visitMode: "inPerson",
    visitDate: today,
    telehealth: { consentObtained: false, consentBy: "", overrideReason: "" },
    patient: {
      firstName: "",
      lastName: "",
      dob: "",
      sex: "",
      insuranceCarrier: "",
      policyNumber: "",
      address: "",
      city: "",
      state: "FL",
      zip: "",
      phone: "",
    },
    accident: {
      accidentDate: "",
      accidentType: "",
      ticketed: "",
      role: "",
      seatbelt: "",
      airbag: "",
      vehicleDrivable: "",
      priorMedical: "",
    },
    pmh: {
      previousAccidents: "",
      surgeries: "",
      allergies: "",
      alcohol: "",
      smoking: "",
      drugs: "",
      medications: "",
      hypertension: "",
      diabetes: "",
      heartDisease: "",
      aggravatedPrevious: "",
      previousConditionDx: "",
      lmp: "",
      pregnant: "",
    },
    gen: {
      bp: "",
      pulse: "",
      resp: "",
      temp: "",
      appearance: "",
      posture: "",
      mood: "",
      cognition: "",
    },
    romExam: {},
    spineExam: {
      cervical: { tenderness: "", spasm: "", rom: "" },
      thoracic: { tenderness: "", spasm: "", rom: "" },
      lumbar: { tenderness: "", spasm: "", rom: "" },
    },
    jointTenderness: {},
    assessment: { autoCodes: [], extraCodes: [], psych: [], manual: "" },
    plan: {
      emLevel: "",
      medicalNecessity: "",
      ptFrequency: "5x/week",
      ptDuration: "4 weeks",
      modalities: [],
      followUp: "2 weeks",
      emc: "",
      causation: "",
      prognosis: "",
    },
    imaging: { selected: [], mriRegion: "", ctRegion: "", usRegion: "" },
    imagingReview: { images: [], findings: "", discussed: "" },
    discharge: {
      outcome: "",
      returnToWork: "",
      returnToActivities: "",
      residualIssues: "",
      residualNote: "",
      sequelae: "",
      continuedCare: "",
      continuedCareNote: "",
    },
    ptDaily: {
      sessionType: "",
      painLevel: "",
      compliance: "",
      treatments: [],
      progress: "",
      modifications: "",
      modificationsNote: "",
      homework: "",
      homeworkNote: "",
    },
    ptWeekly: {
      overallProgress: "",
      sessionsAttended: "",
      compliancePct: "",
      functionalImprovements: "",
      functionalNote: "",
      painTrend: "",
      planNextWeek: "",
      dayNotes: {},
    },
  };
}
