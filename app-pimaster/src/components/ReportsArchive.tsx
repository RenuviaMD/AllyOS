import { useEffect, useState } from "react";
import { getReportHtml, listReports, type SavedReport } from "../lib/store";
import { printHtml } from "../lib/report";

const MODE_LABELS: Record<string, string> = {
  initial: "Initial",
  followup: "Follow-Up",
  final: "Final/Discharge",
  ptdaily: "PT Daily",
  ptprogress: "PT Weekly",
};

export function ReportsArchive(props: { onClose: () => void }) {
  const [reports, setReports] = useState<SavedReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function open(id: string) {
    const html = await getReportHtml(id);
    if (html) printHtml(html);
  }

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Reports Archive</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>
            Close
          </button>
        </div>
        {error && <p className="status warn">Could not load reports: {error}</p>}
        {!reports && !error && <p className="status">Loading…</p>}
        {reports && reports.length === 0 && <p className="status">No reports yet.</p>}
        {reports && reports.length > 0 && (
          <table className="rom-table">
            <thead>
              <tr>
                <th>Date of Service</th>
                <th>Type</th>
                <th>Patient</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.dos}</td>
                  <td>{MODE_LABELS[r.mode] ?? r.mode}</td>
                  <td>{r.patient_label}</td>
                  <td>
                    <button className="btn ghost" onClick={() => open(r.id)}>
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
