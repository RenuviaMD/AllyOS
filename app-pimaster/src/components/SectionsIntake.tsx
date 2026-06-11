import type { VisitForm } from "../lib/types";
import { injuryNarrative } from "../lib/narratives";
import { Section, Select, Text, YesNoField } from "./fields";

export interface SectionProps {
  form: VisitForm;
  patch: <S extends keyof VisitForm>(section: S, partial: Partial<VisitForm[S]>) => void;
  readOnly?: boolean;
}

export function Section1CheckIn({ form, patch }: SectionProps) {
  const p = form.patient;
  return (
    <Section num={1} title="Staff Check-In" tag="All visit types">
      <div className="grid">
        <Text label="Patient First Name" value={p.firstName} onChange={(v) => patch("patient", { firstName: v })} />
        <Text label="Patient Last Name" value={p.lastName} onChange={(v) => patch("patient", { lastName: v })} />
        <Text label="Date of Birth" type="date" value={p.dob} onChange={(v) => patch("patient", { dob: v })} />
        <Select
          label="Sex"
          value={p.sex}
          onChange={(v) => patch("patient", { sex: v as VisitForm["patient"]["sex"] })}
          options={["male", "female", "other"]}
          labels={["Male", "Female", "Other"]}
        />
        <Text label="Insurance Carrier" value={p.insuranceCarrier} onChange={(v) => patch("patient", { insuranceCarrier: v })} />
        <Text label="Policy Number" value={p.policyNumber} onChange={(v) => patch("patient", { policyNumber: v })} />
      </div>
    </Section>
  );
}

export function Section2Injury({ form, patch, readOnly }: SectionProps) {
  const a = form.accident;
  const narrative = injuryNarrative(form.patient, a);
  return (
    <Section num={2} title="Injury Details" tag="All visit types" readOnly={readOnly}>
      <div className="grid">
        <Text label="Accident Date" type="date" value={a.accidentDate} onChange={(v) => patch("accident", { accidentDate: v })} />
        <Select
          label="Accident Type"
          value={a.accidentType}
          onChange={(v) => patch("accident", { accidentType: v as VisitForm["accident"]["accidentType"] })}
          options={["MVA", "Work", "Fall", "Sports", "Other"]}
        />
        <YesNoField label="Ticketed" value={a.ticketed} onChange={(v) => patch("accident", { ticketed: v })} />
        <Select
          label="Role"
          value={a.role}
          onChange={(v) => patch("accident", { role: v as VisitForm["accident"]["role"] })}
          options={["Driver", "Passenger", "Pedestrian", "Other"]}
        />
        <YesNoField label="Seatbelt" value={a.seatbelt} onChange={(v) => patch("accident", { seatbelt: v })} />
        <YesNoField label="Airbag" value={a.airbag} onChange={(v) => patch("accident", { airbag: v })} />
        <YesNoField label="Vehicle Drivable" value={a.vehicleDrivable} onChange={(v) => patch("accident", { vehicleDrivable: v })} />
        <YesNoField label="Prior Medical Professional" value={a.priorMedical} onChange={(v) => patch("accident", { priorMedical: v })} />
      </div>
      {narrative && <div className="narr">{narrative}</div>}
    </Section>
  );
}
