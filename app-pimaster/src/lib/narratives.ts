import { CLINIC } from "./clinic";
import type { AccidentInfo, ImagingReview, PatientInfo, Pmh, TelehealthInfo, VisitType } from "./types";

function yn(v: string, yes: string, no: string): string {
  if (v === "yes") return yes;
  if (v === "no") return no;
  return "";
}

/** 2026-06-20 → 06/20/2026 for clinical prose; leaves anything else as entered. */
function usDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

function ageOn(dob: string, onDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(onDate) ? new Date(onDate + "T00:00:00Z") : new Date();
  const b = new Date(dob + "T00:00:00Z");
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  if (ref.getUTCMonth() < b.getUTCMonth() || (ref.getUTCMonth() === b.getUTCMonth() && ref.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Auto-generated HPI from Section 2 answers, in standard clinical style:
 * the patient is identified by age/sex descriptor — never by name — and the
 * mechanism reads as connected prose. Every sentence maps to an entered
 * field; blank fields contribute nothing.
 */
export function injuryNarrative(
  patient: PatientInfo,
  a: AccidentInfo,
  opts?: { visitDate?: string; visitType?: VisitType },
): string {
  if (!a.accidentDate && !a.accidentType) return "";

  const age = ageOn(patient.dob, opts?.visitDate ?? "");
  const sexWord = patient.sex === "male" ? "male" : patient.sex === "female" ? "female" : "";
  const he = patient.sex === "male" ? "he" : patient.sex === "female" ? "she" : "the patient";
  const He = he[0].toUpperCase() + he.slice(1);

  const descriptor = [age !== null ? `${age}-year-old` : "", sexWord].filter(Boolean).join(" ");
  const opening = descriptor ? `The patient is a ${descriptor} who presents` : "The patient presents";
  const purpose = { initial: " for initial evaluation of injuries sustained in", followup: " for follow-up evaluation of injuries sustained in", final: " for final evaluation of injuries sustained in" }[
    opts?.visitType ?? "initial"
  ];

  const typeText: Record<string, string> = {
    MVA: "a motor vehicle collision",
    Work: "a work-related accident",
    Fall: "a fall",
    Sports: "a sports-related injury",
    Other: "an accident",
  };
  const parts: string[] = [];
  let s1 = `${opening}${purpose} ${typeText[a.accidentType] || "an accident"}`;
  if (a.accidentDate) s1 += ` that occurred on ${usDate(a.accidentDate)}`;
  parts.push(s1 + ".");

  if (a.role) {
    const roleText: Record<string, string> = {
      Driver: `${he} was the driver of the vehicle`,
      "Front Passenger": `${he} was the front-seat passenger of the vehicle`,
      "Rear Passenger": `${he} was a rear-seat passenger of the vehicle`,
      Passenger: `${he} was a passenger in the vehicle`,
      Pedestrian: `${he} was struck as a pedestrian`,
      Other: "",
    };
    const rt = roleText[a.role] ?? "";
    if (rt) parts.push(`At the time of the collision, ${rt}.`);
  }

  const restraint: string[] = [];
  const seatbelt = yn(a.seatbelt, `${he} was restrained by a seatbelt`, `${he} was not wearing a seatbelt`);
  if (seatbelt) restraint.push(seatbelt);
  const airbag = yn(a.airbag, "the airbags deployed on impact", "the airbags did not deploy");
  if (airbag) restraint.push(airbag);
  if (restraint.length) {
    const joined = restraint.join(", and ");
    parts.push(joined[0].toUpperCase() + joined.slice(1) + ".");
  }
  const drivable = yn(a.vehicleDrivable, "The vehicle remained drivable following the impact.", "The vehicle was disabled and could not be driven from the scene.");
  if (drivable) parts.push(drivable);

  const ticketed = yn(a.ticketed, "The patient was cited at the scene.", "No citation was issued to the patient.");
  if (ticketed) parts.push(ticketed);

  const prior = yn(
    a.priorMedical,
    `${He} received medical evaluation for these injuries prior to presenting to this office.`,
    `${He} has not received medical evaluation or treatment for these injuries prior to today's visit.`,
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

/** Causation Statement from the physician's documented opinion — never auto-asserted. */
export function causationStatement(causation: "" | "related" | "not-related" | "undetermined", accidentDate: string, accidentType: string): string {
  if (!causation) return "";
  const event = `${accidentType === "MVA" ? "motor vehicle accident" : "accident"}${accidentDate ? ` of ${accidentDate}` : ""}`;
  switch (causation) {
    case "related":
      return `Based on the patient's history, the reported mechanism of injury, the clinical presentation, and today's examination findings, it is my opinion within a reasonable degree of medical probability that the diagnoses documented above are causally related to the ${event}.`;
    case "not-related":
      return `Based on the patient's history and today's examination findings, it is my opinion that the documented findings are not causally related to the ${event}.`;
    case "undetermined":
      return `Causation with respect to the ${event} cannot be determined at this time; further evaluation and diagnostic correlation are required.`;
  }
}

export function prognosisStatement(prognosis: string): string {
  if (!prognosis) return "";
  return `Prognosis is assessed as ${prognosis.toLowerCase()} based on the patient's current clinical presentation, documented functional limitations, and anticipated response to the prescribed course of treatment.`;
}

/** Physician certification block (mirrors the clinic's certification language). */
export function certificationStatement(): string {
  return (
    `I certify that I personally evaluated the patient on the date of service and that the findings, diagnoses, and ` +
    `treatment plan documented above are based on the patient's history, reported accident mechanism, clinical presentation, ` +
    `examination findings, and my medical judgment. This documentation is based on clinical findings only; it is not based on ` +
    `reimbursement, referral source, therapy use, or case value. I certify that the above information is true and correct to ` +
    `the best of my medical judgment.`
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
