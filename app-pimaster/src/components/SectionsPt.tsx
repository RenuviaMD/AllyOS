import { PT_MODALITIES } from "../lib/cpt";
import type { VisitForm } from "../lib/types";
import { buildTimeline, daysSinceAccident, weekBounds, weekNumber } from "../lib/weeks";
import { Area, CheckGroup, Section, Select, Text, YesNoField } from "./fields";
import type { SectionProps } from "./SectionsIntake";

export function Section11PtDaily({ form, patch }: SectionProps) {
  const s = form.ptDaily;
  return (
    <Section num={11} title="PT Daily Session" tag="PT only · All visits">
      <div className="grid">
        <Select
          label="Session Type"
          value={s.sessionType}
          onChange={(v) => patch("ptDaily", { sessionType: v as VisitForm["ptDaily"]["sessionType"] })}
          options={["Treatment", "Assessment", "Education", "Exercise"]}
        />
        <Select label="Pain Level (0–10)" value={s.painLevel} onChange={(v) => patch("ptDaily", { painLevel: v })} options={Array.from({ length: 11 }, (_, i) => String(i))} />
        <Select
          label="Compliance"
          value={s.compliance}
          onChange={(v) => patch("ptDaily", { compliance: v as VisitForm["ptDaily"]["compliance"] })}
          options={["Poor", "Fair", "Good", "Excellent"]}
        />
        <Select
          label="Progress"
          value={s.progress}
          onChange={(v) => patch("ptDaily", { progress: v as VisitForm["ptDaily"]["progress"] })}
          options={["Regressing", "Same", "Improving", "Significantly"]}
        />
        <YesNoField label="Modifications" value={s.modifications} onChange={(v) => patch("ptDaily", { modifications: v })} />
        {s.modifications === "yes" && (
          <Text label="Modifications (brief)" value={s.modificationsNote} onChange={(v) => patch("ptDaily", { modificationsNote: v })} />
        )}
        <YesNoField label="Homework" value={s.homework} onChange={(v) => patch("ptDaily", { homework: v })} />
        {s.homework === "yes" && (
          <Text label="Homework (brief)" value={s.homeworkNote} onChange={(v) => patch("ptDaily", { homeworkNote: v })} />
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <label className="status">Treatments Provided</label>
        <CheckGroup
          items={PT_MODALITIES.map((m) => ({
            key: m.cpt,
            label: (
              <span>
                <span className="cpt">{m.cpt}</span> {m.name}
              </span>
            ),
          }))}
          selected={s.treatments}
          onChange={(sel) => patch("ptDaily", { treatments: sel })}
        />
      </div>
    </Section>
  );
}

export function Section12PtWeekly({ form, patch }: SectionProps) {
  const w = form.ptWeekly;
  const acc = form.accident.accidentDate;
  const bounds = weekBounds(form.visitDate);
  const days = acc ? daysSinceAccident(acc, form.visitDate) : null;
  const wk = acc ? weekNumber(acc, form.visitDate) : null;
  const timeline = acc ? buildTimeline(acc, form.visitDate, 56) : [];

  function setDay(date: string, field: "pain" | "note", value: string) {
    const cur = w.dayNotes[date] ?? { pain: "", note: "" };
    patch("ptWeekly", { dayNotes: { ...w.dayNotes, [date]: { ...cur, [field]: value } } });
  }

  return (
    <Section num={12} title="PT Weekly Summary" tag="PT only · All visits">
      <table className="rom-table" style={{ marginBottom: 12 }}>
        <tbody>
          <tr>
            <th>Week (Sun–Sat)</th>
            <td>{bounds.start} → {bounds.end}</td>
            <th>Week Number</th>
            <td>{wk ?? "— set accident date —"}</td>
            <th>Days Since Accident</th>
            <td>{days ?? "—"}</td>
          </tr>
        </tbody>
      </table>
      <div className="grid">
        <Select
          label="Overall Progress"
          value={w.overallProgress}
          onChange={(v) => patch("ptWeekly", { overallProgress: v as VisitForm["ptWeekly"]["overallProgress"] })}
          options={["Regressing", "Plateau", "Improving", "Significantly"]}
        />
        <Select label="Sessions Attended (of 5)" value={w.sessionsAttended} onChange={(v) => patch("ptWeekly", { sessionsAttended: v })} options={["0", "1", "2", "3", "4", "5"]} />
        <Text label="Compliance %" value={w.compliancePct} onChange={(v) => patch("ptWeekly", { compliancePct: v })} />
        <Select
          label="Pain Trend"
          value={w.painTrend}
          onChange={(v) => patch("ptWeekly", { painTrend: v as VisitForm["ptWeekly"]["painTrend"] })}
          options={["Decreasing", "Stable", "Increasing"]}
        />
        <YesNoField
          label="Functional Improvements"
          value={w.functionalImprovements}
          onChange={(v) => patch("ptWeekly", { functionalImprovements: v })}
        />
        {w.functionalImprovements === "yes" && (
          <Text label="Improvements (brief)" value={w.functionalNote} onChange={(v) => patch("ptWeekly", { functionalNote: v })} />
        )}
        <Area label="Plan for Next Week" value={w.planNextWeek} onChange={(v) => patch("ptWeekly", { planNextWeek: v })} />
      </div>
      {timeline.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <label className="status" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
            Day-by-Day Progress (from accident date)
          </label>
          <div className="timeline">
            {timeline.map((d) => (
              <div key={d.date} className={`timeline-day${d.dayNumber === 1 ? " injury" : ""}`}>
                <span className="d-label">
                  {d.label} · {d.date}
                </span>
                {d.dayNumber === 1 ? (
                  <span className="status" style={{ gridColumn: "2 / -1" }}>Day of Injury</span>
                ) : (
                  <>
                    <input
                      placeholder="Pain"
                      value={w.dayNotes[d.date]?.pain ?? ""}
                      onChange={(e) => setDay(d.date, "pain", e.target.value)}
                      style={{ background: "var(--hover)", border: "1px solid #46627f", color: "var(--text)", borderRadius: 4, padding: "3px 6px" }}
                    />
                    <input
                      placeholder="Progress / treatment note"
                      value={w.dayNotes[d.date]?.note ?? ""}
                      onChange={(e) => setDay(d.date, "note", e.target.value)}
                      style={{ background: "var(--hover)", border: "1px solid #46627f", color: "var(--text)", borderRadius: 4, padding: "3px 6px" }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
