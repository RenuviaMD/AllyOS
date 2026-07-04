import { useEffect, useState } from "react";
import { listPackageDocReports, listReportsForDay, type DayReport } from "../lib/store";
import {
  buildTodayRows,
  CLINICAL_MODES,
  groupPackageDocs,
  MODE_TITLES,
  packetStatus,
  PT_MODES,
  type TodayVisitRow,
} from "../lib/today";
import type { Role, VisitForm } from "../lib/types";
import { daysSinceAccident } from "../lib/weeks";

/**
 * Today's Visits landing (UX Blueprint U1) — the schedule-first home screen.
 * Staff see today's check-ins with reception-packet status; the physician
 * sees today's queue with one-tap open-encounter; PT sees today's sessions.
 * Data: reports with DOS = today plus the active draft.
 */
export function TodayVisits(props: {
  role: Role;
  form: VisitForm;
  onOpenEncounter: () => void;
  onNewVisit: () => void;
}) {
  const { role, form } = props;
  const today = new Date().toISOString().slice(0, 10);
  const [reports, setReports] = useState<DayReport[] | null>(null);
  const [packetDocs, setPacketDocs] = useState<Record<string, Record<string, string[]>>>({});

  useEffect(() => {
    listReportsForDay(today)
      .then(setReports)
      .catch(() => setReports([]));
    if (role === "staff") {
      listPackageDocReports().then((rows) => setPacketDocs(groupPackageDocs(rows)));
    }
  }, [role, today]);

  const modeFilter =
    role === "physician"
      ? (m: string) => CLINICAL_MODES.includes(m)
      : role === "pt"
        ? (m: string) => PT_MODES.includes(m)
        : undefined;
  const rows = buildTodayRows(reports ?? [], form, modeFilter);

  const heading = role === "staff" ? "Today's Check-Ins" : role === "pt" ? "Today's PT Sessions" : "Today's Visits";
  const sub =
    role === "staff"
      ? "Patients seen today with reception-packet status. Open a check-in to enter demographics and print signature forms."
      : role === "pt"
        ? "Sessions documented today plus the open session."
        : "The day's queue — the open encounter first, then everything already documented.";

  return (
    <div className="today">
      <div className="today-head">
        <div>
          <h2 className="today-title">{heading}</h2>
          <div className="status">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {sub}
          </div>
        </div>
        <button className="btn" onClick={props.onNewVisit}>
          ＋ New Visit
        </button>
      </div>

      {reports === null && <p className="status">Loading today's visits…</p>}
      {reports !== null && rows.length === 0 && (
        <div className="today-empty">
          <p>No visits yet today.</p>
          <p className="status">Start a new visit, or open the Reports Archive for prior days.</p>
        </div>
      )}

      {rows.map((r) => (
        <TodayRow
          key={r.key}
          row={r}
          role={role}
          today={today}
          packet={role === "staff" ? packetStatus(r.form ?? {}, packetDocs[r.key], today) : null}
          onOpen={props.onOpenEncounter}
        />
      ))}
    </div>
  );
}

function TodayRow(props: {
  row: TodayVisitRow;
  role: Role;
  today: string;
  packet: { done: string[]; missing: string[] } | null;
  onOpen: () => void;
}) {
  const { row, role, packet } = props;
  const doa = row.form?.accident?.accidentDate ?? "";
  const day = doa ? daysSinceAccident(doa, props.today) : null;

  return (
    <div className={`today-row${row.hasDraft ? " open-enc" : ""}`}>
      <div className="today-who">
        <span className="today-name">{row.name}</span>
        <span className="status">
          {row.dob && `DOB ${row.dob}`}
          {day !== null && day > 0 && ` · Day ${day} post-accident`}
        </span>
      </div>
      <div className="today-badges">
        {row.visitType && <span className="ptb-badge">{row.visitType.toUpperCase()}</span>}
        {row.visitMode && (
          <span className={`ptb-badge ${row.visitMode === "telehealth" ? "tele" : ""}`}>
            {row.visitMode === "telehealth" ? "TELEHEALTH" : "IN-PERSON"}
          </span>
        )}
      </div>
      <div className="today-docs">
        {row.documented.map((d) => (
          <span key={d.id} className="today-doc" title={`Generated at ${d.time}`}>
            ✓ {MODE_TITLES[d.mode] ?? d.mode} {d.time && <em>{d.time}</em>}
          </span>
        ))}
        {row.documented.length === 0 && !row.hasDraft && <span className="status">—</span>}
        {packet && (
          <span className={`today-packet ${packet.missing.length === 0 ? "ok" : "todo"}`}
            title={packet.missing.length > 0 ? `Missing: ${packet.missing.join(", ")}` : "All reception forms signed"}>
            {packet.missing.length === 0
              ? packet.done.length > 0
                ? `Packet ✓ ${packet.done.length}/${packet.done.length}`
                : "Packet ✓ — none due"
              : `Packet ${packet.done.length}/${packet.done.length + packet.missing.length} — ${packet.missing.join(", ")}`}
          </span>
        )}
      </div>
      <div className="today-actions">
        {row.hasDraft ? (
          <button className="btn" onClick={props.onOpen}>
            {role === "staff" ? "Open Check-In" : role === "pt" ? "Open Session" : "Open Encounter"}
          </button>
        ) : (
          <span className="status ok">Documented</span>
        )}
      </div>
    </div>
  );
}
