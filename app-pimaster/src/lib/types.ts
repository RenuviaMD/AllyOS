export type VisitType = "initial" | "followup" | "final";
export type Role = "staff" | "physician" | "pt";
export type YesNo = "" | "yes" | "no";
export type RomGrade = "" | "full" | "partial" | "limited" | "cannot";

export interface PatientInfo {
  firstName: string;
  lastName: string;
  dob: string;
  sex: "" | "male" | "female" | "other";
  insuranceCarrier: string;
  policyNumber: string;
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
  heentAbnormal: YesNo;
  heentFindings: string;
  abdomenAbnormal: YesNo;
  abdomenFindings: string;
  neuroNormal: YesNo;
  cardioNormal: YesNo;
  respNormal: YesNo;
}

/** movementId -> grade */
export type RomExam = Record<string, RomGrade>;

export interface DxCode {
  code: string;
  desc: string;
}

export interface Assessment {
  /** auto-populated from ROM; physician may remove */
  autoCodes: DxCode[];
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
  visitDate: string;
  patient: PatientInfo;
  accident: AccidentInfo;
  pmh: Pmh;
  gen: GeneralExam;
  romExam: RomExam;
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
    visitDate: today,
    patient: { firstName: "", lastName: "", dob: "", sex: "", insuranceCarrier: "", policyNumber: "" },
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
      heentAbnormal: "",
      heentFindings: "",
      abdomenAbnormal: "",
      abdomenFindings: "",
      neuroNormal: "",
      cardioNormal: "",
      respNormal: "",
    },
    romExam: {},
    assessment: { autoCodes: [], psych: [], manual: "" },
    plan: {
      emLevel: "",
      medicalNecessity: "",
      ptFrequency: "5x/week",
      ptDuration: "4 weeks",
      modalities: [],
      followUp: "2 weeks",
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
