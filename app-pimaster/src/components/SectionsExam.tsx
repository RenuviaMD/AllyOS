import type { RomGrade, VisitForm, YesNo } from "../lib/types";
import { aggravationNarrative } from "../lib/narratives";
import { EXAM_REGIONS, GRADE_LABELS, JOINT_REGIONS, SPINE_REGION_IDS, SPINE_REGION_LABELS } from "../lib/rom";
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
  const telehealth = form.visitMode === "telehealth";
  return (
    <Section num={4} title="General Examination" tag={telehealth ? "Vitals by on-site staff" : "Physician only"}>
      <div className="grid">
        <Text label={telehealth ? "Blood Pressure (staff)" : "Blood Pressure"} value={g.bp} onChange={(v) => patch("gen", { bp: v })} />
        <Text label="Pulse" value={g.pulse} onChange={(v) => patch("gen", { pulse: v })} />
        <Text label="Respirations" value={g.resp} onChange={(v) => patch("gen", { resp: v })} />
        <Text label="Temperature" value={g.temp} onChange={(v) => patch("gen", { temp: v })} />
        <Text label="Appearance" value={g.appearance} onChange={(v) => patch("gen", { appearance: v })} />
        <Text label="Posture" value={g.posture} onChange={(v) => patch("gen", { posture: v })} />
        <Text label="Mood / Affect" value={g.mood} onChange={(v) => patch("gen", { mood: v })} />
        <Text label="Cognition" value={g.cognition} onChange={(v) => patch("gen", { cognition: v })} />
      </div>
    </Section>
  );
}

const GRADES: Exclude<RomGrade, "">[] = ["wnl", "limited", "cannot"];

function GradeButtons(props: { value: RomGrade; onChange: (g: RomGrade) => void }) {
  return (
    <div className="rom-grades">
      {GRADES.map((g) => (
        <button
          key={g}
          type="button"
          className={`g-${g}${props.value === g ? " sel" : ""}`}
          onClick={() => props.onChange(props.value === g ? "" : g)}
        >
          {GRADE_LABELS[g]}
        </button>
      ))}
    </div>
  );
}

function TendernessToggle(props: { label: string; value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <span className="yn" style={{ alignItems: "center", gap: 8 }}>
      <span className="status">{props.label}</span>
      <button
        type="button"
        className={props.value === "yes" ? "on-no" : ""}
        onClick={() => props.onChange(props.value === "yes" ? "" : "yes")}
      >
        Present
      </button>
      <button
        type="button"
        className={props.value === "no" ? "on-yes" : ""}
        onClick={() => props.onChange(props.value === "no" ? "" : "no")}
      >
        Absent
      </button>
    </span>
  );
}

export function Section5Exam({ form, patch }: SectionProps) {
  const telehealth = form.visitMode === "telehealth";

  function setGrade(maneuverId: string, grade: RomGrade) {
    patch("romExam", { [maneuverId]: grade });
  }
  function setSpine(regionId: (typeof SPINE_REGION_IDS)[number], field: "tenderness" | "spasm" | "rom", value: string) {
    patch("spineExam", { [regionId]: { ...form.spineExam[regionId], [field]: value } });
  }
  function setJointTenderness(regionId: string, side: "R" | "L", value: YesNo) {
    const cur = form.jointTenderness[regionId] ?? { R: "" as YesNo, L: "" as YesNo };
    patch("jointTenderness", { [regionId]: { ...cur, [side]: value } });
  }

  /** One-tap normal: every maneuver in the region WNL; hands-on findings "Absent" when in person. */
  function markRegionNormal(region: (typeof EXAM_REGIONS)[number]) {
    const rom: Record<string, RomGrade> = {};
    for (const mv of region.maneuvers) rom[mv.id] = "wnl";
    patch("romExam", rom);
    if (region.kind === "joint" && !telehealth) {
      patch("jointTenderness", { [region.id]: { R: "no", L: "no" } });
    }
    if (region.kind === "spine" && (SPINE_REGION_IDS as readonly string[]).includes(region.id)) {
      const id = region.id as (typeof SPINE_REGION_IDS)[number];
      patch("spineExam", {
        [id]: telehealth
          ? { ...form.spineExam[id], rom: "wnl" }
          : { tenderness: "no", spasm: "no", rom: "wnl" },
      });
    }
  }

  function markEntireExamNormal() {
    const rom: Record<string, RomGrade> = {};
    for (const region of EXAM_REGIONS) for (const mv of region.maneuvers) rom[mv.id] = "wnl";
    patch("romExam", rom);
    if (!telehealth) {
      const jt: Record<string, { R: YesNo; L: YesNo }> = {};
      for (const region of JOINT_REGIONS) jt[region.id] = { R: "no", L: "no" };
      patch("jointTenderness", jt);
      patch("spineExam", {
        cervical: { tenderness: "no", spasm: "no", rom: "wnl" },
        thoracic: { tenderness: "no", spasm: "no", rom: "wnl" },
        lumbar: { tenderness: "no", spasm: "no", rom: "wnl" },
      });
    } else {
      patch("spineExam", {
        cervical: { ...form.spineExam.cervical, rom: "wnl" },
        thoracic: { ...form.spineExam.thoracic, rom: "wnl" },
        lumbar: { ...form.spineExam.lumbar, rom: "wnl" },
      });
    }
  }

  const spineRegions = EXAM_REGIONS.filter((r) => r.kind === "spine");

  return (
    <Section
      num={5}
      title="Spine & Extremity Examination"
      tag={telehealth ? "Telehealth — observed functional exam" : "Physician only"}
    >
      {telehealth && (
        <p className="status warn">
          Telehealth visit: hands-on findings (tenderness/spasm) are not assessed. Results below document observed
          functional limitation only — normal values are reference ranges, not measurements.
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="bulk-btn" onClick={markEntireExamNormal}>
          ✓ Mark entire exam normal — then change only abnormal findings
        </button>
      </div>

      <h3 className="exam-h">Spine Examination</h3>
      <table className="rom-table" style={{ marginBottom: 14 }}>
        <thead>
          <tr>
            <th>Region</th>
            {!telehealth && <th>Tenderness</th>}
            {!telehealth && <th>Spasm</th>}
            <th>ROM</th>
          </tr>
        </thead>
        <tbody>
          {SPINE_REGION_IDS.map((id) => (
            <tr key={id}>
              <td>{SPINE_REGION_LABELS[id]}</td>
              {!telehealth && (
                <td>
                  <TendernessToggle label="" value={form.spineExam[id].tenderness} onChange={(v) => setSpine(id, "tenderness", v)} />
                </td>
              )}
              {!telehealth && (
                <td>
                  <TendernessToggle label="" value={form.spineExam[id].spasm} onChange={(v) => setSpine(id, "spasm", v)} />
                </td>
              )}
              <td>
                <GradeButtons value={form.spineExam[id].rom} onChange={(g) => setSpine(id, "rom", g)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {spineRegions.map((region) => (
        <div key={region.id} style={{ marginBottom: 14 }}>
          <h3 className="exam-h">
            {region.label} — Functional Maneuvers{" "}
            <button type="button" className="bulk-btn" style={{ marginLeft: 8 }} onClick={() => markRegionNormal(region)}>
              All WNL
            </button>
          </h3>
          {region.maneuvers.map((mv) => (
            <div key={mv.id} className="maneuver-row">
              <div className="maneuver-info">
                <span className="maneuver-name">{mv.label}</span>
                <span className="maneuver-script">“{mv.script}”</span>
                <span className="maneuver-normal">Normal: {mv.normalLabel}</span>
              </div>
              <GradeButtons value={form.romExam[mv.id] ?? ""} onChange={(g) => setGrade(mv.id, g)} />
            </div>
          ))}
        </div>
      ))}

      <h3 className="exam-h">Extremity / Joint Examination</h3>
      {JOINT_REGIONS.map((region) => (
        <div key={region.id} style={{ marginBottom: 14 }}>
          <div className="joint-head">
            <span className="maneuver-name">{region.label}</span>
            <button type="button" className="bulk-btn" onClick={() => markRegionNormal(region)}>
              All WNL
            </button>
            {!telehealth && (
              <>
                <TendernessToggle
                  label="R tenderness"
                  value={form.jointTenderness[region.id]?.R ?? ""}
                  onChange={(v) => setJointTenderness(region.id, "R", v)}
                />
                <TendernessToggle
                  label="L tenderness"
                  value={form.jointTenderness[region.id]?.L ?? ""}
                  onChange={(v) => setJointTenderness(region.id, "L", v)}
                />
              </>
            )}
          </div>
          {region.maneuvers.map((mv) => (
            <div key={mv.id} className="maneuver-row">
              <div className="maneuver-info">
                <span className="maneuver-name">{mv.label}</span>
                <span className="maneuver-script">“{mv.script}”</span>
                <span className="maneuver-normal">Normal: {mv.normalLabel}</span>
              </div>
              <GradeButtons value={form.romExam[mv.id] ?? ""} onChange={(g) => setGrade(mv.id, g)} />
            </div>
          ))}
        </div>
      ))}
    </Section>
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
