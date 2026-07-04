import type { VisitForm } from "../lib/types";
import { daysSinceAccident } from "../lib/weeks";

/**
 * Persistent patient banner (UX Blueprint U2) — the EMR convention: once a
 * patient is loaded, their identity and claim context pin above the chart on
 * every screen. The days-post-accident counter keeps the FL PIP 14-day window
 * visible at a glance (green within, red beyond — informational only).
 */
export function PatientBanner({ form }: { form: VisitForm }) {
  const p = form.patient;
  const name = `${p.lastName}${p.lastName && p.firstName ? ", " : ""}${p.firstName}`.trim();
  if (!name) return null;

  const age = ageOn(p.dob, form.visitDate);
  const sexAbbrev = p.sex === "male" ? "M" : p.sex === "female" ? "F" : "";
  const day = form.accident.accidentDate && form.visitDate ? daysSinceAccident(form.accident.accidentDate, form.visitDate) : null;

  return (
    <div className="pt-banner">
      <span className="ptb-name">{name}</span>
      {(age !== null || sexAbbrev) && <span className="ptb-item">{age !== null ? age : ""}{sexAbbrev}</span>}
      {p.dob && <span className="ptb-item">DOB {p.dob}</span>}
      {p.insuranceCarrier && <span className="ptb-item">{p.insuranceCarrier}</span>}
      {p.claimNumber && <span className="ptb-item">Claim # {p.claimNumber}</span>}
      {form.accident.accidentDate && <span className="ptb-item">DOA {form.accident.accidentDate}</span>}
      {day !== null && day > 0 && (
        <span className={`ptb-day ${day <= 14 ? "ok" : "late"}`} title="Days from accident to this visit — FL PIP requires initial services within 14 days">
          Day {day}
        </span>
      )}
      <span className="ptb-badge">{form.visitType.toUpperCase()}</span>
      <span className={`ptb-badge ${form.visitMode === "telehealth" ? "tele" : ""}`}>
        {form.visitMode === "telehealth" ? "TELEHEALTH" : "IN-PERSON"}
      </span>
    </div>
  );
}

function ageOn(dob: string, onDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(onDate) ? new Date(onDate + "T00:00:00Z") : new Date();
  const b = new Date(dob + "T00:00:00Z");
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  if (ref.getUTCMonth() < b.getUTCMonth() || (ref.getUTCMonth() === b.getUTCMonth() && ref.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
