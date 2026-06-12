import { JOINT_REGIONS, SPINE_REGION_IDS } from "./rom";
import type { VisitForm } from "./types";

export interface AuditResult {
  errors: string[];
  warnings: string[];
}

/**
 * Pre-signature audit of a clinical note. Errors block generation;
 * warnings are shown to the physician but do not block.
 */
export function auditNote(form: VisitForm): AuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!form.patient.firstName.trim() || !form.patient.lastName.trim()) {
    errors.push("Patient name is incomplete (Section 1).");
  }
  if (!form.patient.dob) errors.push("Date of birth is missing (Section 1).");
  if (!form.accident.accidentDate) errors.push("Accident date is missing (Section 2).");
  if (!form.plan.medicalNecessity.trim()) {
    errors.push("Medical necessity rationale is required for all visits (Section 7).");
  }
  if (!form.plan.emLevel) warnings.push("No E/M level selected (Section 7).");

  if (form.visitMode === "telehealth") {
    if (!form.telehealth.consentObtained) {
      errors.push("Telehealth consent has not been documented — required before generating a telehealth note.");
    }
    // Hands-on findings cannot exist on a telehealth visit. The exam form hides
    // these inputs, but data entered before switching modality must be cleared.
    const spineHandsOn = SPINE_REGION_IDS.some(
      (id) => form.spineExam[id]?.tenderness || form.spineExam[id]?.spasm,
    );
    const jointHandsOn = JOINT_REGIONS.some((r) => {
      const t = form.jointTenderness[r.id];
      return t && (t.R === "yes" || t.L === "yes");
    });
    if (spineHandsOn || jointHandsOn) {
      errors.push(
        "Hands-on findings (tenderness/spasm) are recorded on a telehealth visit. Clear them or change the visit to In-Person.",
      );
    }
  }

  if (form.visitType === "final" && !form.discharge.outcome) {
    errors.push("Final visit requires an overall outcome (Section 10).");
  }
  if (form.visitType === "initial" && form.imaging.selected.length === 0 && !form.imaging.mriRegion && !form.imaging.ctRegion && !form.imaging.usRegion) {
    warnings.push("No imaging ordered on the initial visit.");
  }

  return { errors, warnings };
}
