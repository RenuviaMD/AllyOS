import type { RomGrade, VisitForm } from "../lib/types";
import { aggravationNarrative } from "../lib/narratives";
import { estimateDegrees, GRADE_LABELS, ROM_REGIONS } from "../lib/rom";
import { Area, Section, Text, YesNoField } from "./fields";
import type { SectionProps } from "./SectionsIntake";

export function Section3Pmh({ form, patch }: SectionProps) {
  const m = form.pmh;
  const agg = aggravationNarrative(m, form.accident.accidentType);
  return (
    <Section num={3} title="Past Medical History" tag="Physician only">
      <div className="grid">
        <YesNoField label="Previous Accidents" value={m.previousAccidents} onChange={(v) => patch("pmh", { previousAccidents: v })} />
        <YesNoField label="Surgeries" value={m.surgeries} onChange={(v) => patch("pmh", { surgeries: v })} />
        <YesNoField label="Allergies" value={m.allergies} onChange={(v) => patch("pmh", { allergies: v })} />
        <YesNoField label="Alcohol" value={m.alcohol} onChange={(v) => patch("pmh", { alcohol: v })} />
        <YesNoField label="Smoking" value={m.smoking} onChange={(v) => patch("pmh", { smoking: v })} />
        <YesNoField label="Drugs" value={m.drugs} onChange={(v) => patch("pmh", { drugs: v })} />
        <YesNoField label="Medications" value={m.medications} onChange={(v) => patch("pmh", { medications: v })} />
        <YesNoField label="Hypertension" value={m.hypertension} onChange={(v) => patch("pmh", { hypertension: v })} />
        <YesNoField label="Diabetes" value={m.diabetes} onChange={(v) => patch("pmh", { diabetes: v })} />
        <YesNoField label="Heart Disease" value={m.heartDisease} onChange={(v) => patch("pmh", { heartDisease: v })} />
        <YesNoField
          label="Injury Aggravated Previous Condition"
          value={m.aggravatedPrevious}
          onChange={(v) => patch("pmh", { aggravatedPrevious: v })}
        />
        {m.aggravatedPrevious === "yes" && (
          <Text
            label="Previous Condition Diagnosis"
            value={m.previousConditionDx}
            onChange={(v) => patch("pmh", { previousConditionDx: v })}
            wide
          />
        )}
        {form.patient.sex === "female" && (
          <Text label="Last Menstrual Period" type="date" value={m.lmp} onChange={(v) => patch("pmh", { lmp: v })} />
        )}
        <YesNoField
          label="Pregnant"
          value={m.pregnant}
          onChange={(v) => patch("pmh", { pregnant: v as VisitForm["pmh"]["pregnant"] })}
          extra={[{ label: "N/A", value: "na" }]}
        />
      </div>
      {agg && <div className="narr">{agg}</div>}
    </Section>
  );
}

export function Section4GeneralExam({ form, patch }: SectionProps) {
  const g = form.gen;
  return (
    <Section num={4} title="General Exam" tag="Physician only">
      <div className="grid">
        <Text label="Blood Pressure" value={g.bp} onChange={(v) => patch("gen", { bp: v })} />
        <Text label="Pulse" value={g.pulse} onChange={(v) => patch("gen", { pulse: v })} />
        <Text label="Respirations" value={g.resp} onChange={(v) => patch("gen", { resp: v })} />
        <Text label="Temperature" value={g.temp} onChange={(v) => patch("gen", { temp: v })} />
        <Text label="General Appearance" value={g.appearance} onChange={(v) => patch("gen", { appearance: v })} wide />
        <YesNoField label="HEENT Abnormal" value={g.heentAbnormal} onChange={(v) => patch("gen", { heentAbnormal: v })} />
        {g.heentAbnormal === "yes" && (
          <Text label="HEENT Findings" value={g.heentFindings} onChange={(v) => patch("gen", { heentFindings: v })} />
        )}
        <YesNoField label="Abdomen Abnormal" value={g.abdomenAbnormal} onChange={(v) => patch("gen", { abdomenAbnormal: v })} />
        {g.abdomenAbnormal === "yes" && (
          <Text label="Abdomen Findings" value={g.abdomenFindings} onChange={(v) => patch("gen", { abdomenFindings: v })} />
        )}
        <YesNoField label="Neuro Screen Normal" value={g.neuroNormal} onChange={(v) => patch("gen", { neuroNormal: v })} />
        <YesNoField label="Cardiovascular Normal" value={g.cardioNormal} onChange={(v) => patch("gen", { cardioNormal: v })} />
        <YesNoField label="Respiratory Normal" value={g.respNormal} onChange={(v) => patch("gen", { respNormal: v })} />
      </div>
    </Section>
  );
}

const GRADES: Exclude<RomGrade, "">[] = ["full", "partial", "limited", "cannot"];

export function Section5Rom({ form, patch }: SectionProps) {
  function setGrade(movementId: string, grade: RomGrade) {
    const current = form.romExam[movementId];
    patch("romExam", { [movementId]: current === grade ? "" : grade });
  }
  return (
    <Section num={5} title="Functional ROM Assessment" tag="Physician only">
      <p className="status">
        4-point functional scale. Results map to estimated AAOS degrees and auto-populate ICD-10 in Section 6.
      </p>
      <table className="rom-table">
        <tbody>
          {ROM_REGIONS.map((region) => (
            <RegionRows key={region.id} region={region} romExam={form.romExam} setGrade={setGrade} />
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function RegionRows(props: {
  region: (typeof ROM_REGIONS)[number];
  romExam: VisitForm["romExam"];
  setGrade: (movementId: string, grade: RomGrade) => void;
}) {
  return (
    <>
      <tr>
        <td className="rom-region" colSpan={3}>
          {props.region.label}
        </td>
      </tr>
      {props.region.movements.map((m) => {
        const grade = props.romExam[m.id] ?? "";
        const deg = estimateDegrees(m, grade);
        return (
          <tr key={m.id}>
            <td>{m.label}</td>
            <td>
              <div className="rom-grades">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`g-${g}${grade === g ? " sel" : ""}`}
                    onClick={() => props.setGrade(m.id, g)}
                  >
                    {GRADE_LABELS[g]}
                  </button>
                ))}
              </div>
            </td>
            <td className="rom-deg">{deg !== null ? `~${deg}° / ${m.normalDeg}° (${m.motion})` : `${m.motion} — ${m.normalDeg}° normal`}</td>
          </tr>
        );
      })}
    </>
  );
}

export function Section10Discharge({ form, patch }: SectionProps) {
  const d = form.discharge;
  return (
    <Section num={10} title="Final Visit Discharge" tag="Final visit · Physician only">
      <div className="grid">
        <SelectD label="Overall Outcome" value={d.outcome} opts={["Full", "Significant", "Moderate", "Minimal", "None"]} set={(v) => patch("discharge", { outcome: v as VisitForm["discharge"]["outcome"] })} />
        <SelectD label="Return to Work" value={d.returnToWork} opts={["Full Duty", "Modified", "Unable", "On Leave"]} set={(v) => patch("discharge", { returnToWork: v as VisitForm["discharge"]["returnToWork"] })} />
        <SelectD label="Return to Activities" value={d.returnToActivities} opts={["Full", "Partial", "Limited", "None"]} set={(v) => patch("discharge", { returnToActivities: v as VisitForm["discharge"]["returnToActivities"] })} />
        <YesNoField label="Residual Issues" value={d.residualIssues} onChange={(v) => patch("discharge", { residualIssues: v })} />
        {d.residualIssues === "yes" && (
          <Text label="Residual Issues Note" value={d.residualNote} onChange={(v) => patch("discharge", { residualNote: v })} wide />
        )}
        <Text label="Apparent Sequelae (if any)" value={d.sequelae} onChange={(v) => patch("discharge", { sequelae: v })} wide />
        <YesNoField label="Need Continued Care" value={d.continuedCare} onChange={(v) => patch("discharge", { continuedCare: v })} />
        {d.continuedCare === "yes" && (
          <Area label="Continued Care — Explain" value={d.continuedCareNote} onChange={(v) => patch("discharge", { continuedCareNote: v })} />
        )}
      </div>
    </Section>
  );
}

function SelectD(props: { label: string; value: string; opts: string[]; set: (v: string) => void }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <select value={props.value} onChange={(e) => props.set(e.target.value)}>
        <option value="">— select —</option>
        {props.opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
