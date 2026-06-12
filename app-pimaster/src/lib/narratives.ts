import { CLINIC } from "./clinic";
import type { AccidentInfo, ImagingReview, PatientInfo, Pmh, TelehealthInfo, VisitType } from "./types";

function yn(v: string, yes: string, no: string): string {
  if (v === "yes") return yes;
  if (v === "no") return no;
  return "";
}

/** Auto-generated injury narrative from Section 2 answers. */
export function injuryNarrative(patient: PatientInfo, a: AccidentInfo): string {
  if (!a.accidentDate && !a.accidentType) return "";
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "The patient";
  const parts: string[] = [];
  const typeText: Record<string, string> = {
    MVA: "a motor vehicle accident",
    Work: "a work-related accident",
    Fall: "a fall",
    Sports: "a sports-related injury",
    Other: "an accident",
  };
  let s1 = `${name} presents following ${typeText[a.accidentType] || "an accident"}`;
  if (a.accidentDate) s1 += ` that occurred on ${a.accidentDate}`;
  if (a.role) s1 += `, in which the patient was the ${a.role.toLowerCase()}`;
  parts.push(s1 + ".");
  const details: string[] = [];
  const seatbelt = yn(a.seatbelt, "was wearing a seatbelt", "was not wearing a seatbelt");
  if (seatbelt) details.push(seatbelt);
  const airbag = yn(a.airbag, "airbags deployed", "airbags did not deploy");
  if (airbag) details.push(airbag);
  const drivable = yn(a.vehicleDrivable, "the vehicle remained drivable", "the vehicle was not drivable");
  if (drivable) details.push(drivable);
  if (details.length) parts.push(`The patient ${details.join("; ")}.`);
  const ticketed = yn(a.ticketed, "The patient was ticketed at the scene.", "No ticket was issued to the patient.");
  if (ticketed) parts.push(ticketed);
  const prior = yn(
    a.priorMedical,
    "The patient was previously evaluated by a medical professional for this injury.",
    "The patient has not seen a medical professional for this injury prior to today's visit.",
  );
  if (prior) parts.push(prior);
  return parts.join(" ");
}

/** Narrative when this injury aggravated a previous condition. */
export function aggravationNarrative(pmh: Pmh, accidentType: string): string {
  if (pmh.aggravatedPrevious !== "yes" || !pmh.previousConditionDx.trim()) return "";
  const mech = accidentType === "MVA" ? "This MVA" : "This accident";
  return `${mech} aggravated the patient's pre-existing condition of ${pmh.previousConditionDx.trim()}. The patient's current symptomatology represents an exacerbation beyond the prior baseline.`;
}

/** Narrative for the follow-up imaging review section. */
export function imagingReviewNarrative(review: ImagingReview): string {
  const reviewed = review.images.filter((i) => i.reviewed).map((i) => i.name);
  if (reviewed.length === 0) return "";
  let s = `The following imaging studies were reviewed: ${reviewed.join(", ")}.`;
  if (review.findings.trim()) s += ` Findings: ${review.findings.trim()}`;
  if (review.discussed === "yes") {
    s += " Images and findings were reviewed and discussed with the patient, who verbalized understanding.";
  }
  return s;
}

/**
 * Telehealth modality + consent statement. Facility-originated model:
 * the patient is always physically at the clinic (originating site) in Florida;
 * the provider conducts the evaluation from a distant site.
 */
export function telehealthStatement(t: TelehealthInfo): string {
  const consent = t.consentObtained
    ? ` Informed consent for telehealth evaluation was obtained from the patient prior to the encounter${t.consentBy.trim() ? ` by ${t.consentBy.trim()}` : ""} and is documented in the record.`
    : "";
  return (
    `This encounter was conducted via synchronous audio-video telehealth. ` +
    `The patient was physically present at ${CLINIC.name}, ${CLINIC.address} (originating site), with clinic staff in attendance. ` +
    `${CLINIC.provider} conducted the evaluation from a distant site. ` +
    `The patient was located in the State of Florida at the time of service.` +
    consent +
    ` The physical examination was performed by direct observation of patient-performed functional maneuvers; ` +
    `no hands-on findings (palpation, percussion, or manual testing) are reported in this note.`
  );
}

/** Editable starting template for the required medical-necessity rationale. */
export function medicalNecessityTemplate(visitType: VisitType): string {
  switch (visitType) {
    case "initial":
      return "Initiation of care is medically necessary based on today's examination findings, documented range-of-motion deficits, and the patient's reported symptomatology following the accident. ";
    case "followup":
      return "Continuance of care is medically necessary. Progress to date: ";
    case "final":
      return "Closure of care: the patient has reached the documented outcome below and active treatment is concluded. ";
  }
}
