import { useState } from "react";
import {
  autoEvaluate,
  buildEncountersCsv,
  chartScore,
  failedPoints,
  statusFor,
  type ChartStatus,
  type EncounterExport,
} from "../lib/governance";
import { buildServiceLines, loadBillingSettings, totalCharges } from "../lib/billing";
import { buildSuperbillHtml, downloadFile, getReportHtmlOrBuild, printHtml } from "../lib/report";
import { listReportsForWindow, type MonthChart } from "../lib/store";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_CLASS: Record<ChartStatus, string> = {
  PASS: "ok",
  MONITOR: "",
  CORRECTIVE: "warn",
  ESCALATION: "warn",
};

interface Row extends EncounterExport {
  chart: MonthChart;
}

export function AhcaExportPage(props: { onClose: () => void }) {
  const [reviewDate, setReviewDate] = useState(today);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading encounters…");
    try {
      const charts = await listReportsForWindow(reviewDate);
      const settings = loadBillingSettings();
      const built: Row[] = charts.map((c) => {
        const ev = autoEvaluate(c.form, c.cpt_codes, c.icd_codes);
        const score = chartScore(ev);
        const type = c.form?.plan?.emLevel ? "md" : "pt";
        const charge = totalCharges(buildServiceLines(c.form, settings, type));
        return {
          chart: c,
          chartId: c.id.slice(0, 8),
          dos: c.dos,
          initials: c.patient_initials,
          visitType: c.mode,
          modality: c.telehealth ? "Telehealth" : "In-Person",
          telehealth: c.telehealth,
          icd: c.icd_codes,
          cpt: c.cpt_codes,
          chargeTotal: charge,
          deficiencies: score.no,
          riskStatus: statusFor(score.pct),
          riskFlags: failedPoints(ev),
        };
      });
      // highest risk first to aid triage
      built.sort((a, b) => b.deficiencies - a.deficiencies);
      setRows(built);
      setSelected(new Set());
      setStatus(charts.length === 0 ? "No encounters in the 30-day window." : `${charts.length} encounters loaded (highest risk first).`);
    } catch (e) {
      setStatus(`Could not load: ${e instanceof Error ? e.message : e}`);
    }
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function exportCsv(onlySelected: boolean) {
    if (!rows) return;
    const subset = onlySelected ? rows.filter((r) => selected.has(r.chart.id)) : rows;
    const csv = buildEncountersCsv(subset);
    const tag = onlySelected ? "selected" : "30day";
    downloadFile(`ahca-encounters-${tag}-${reviewDate}.csv`, csv);
    setStatus(`Exported ${subset.length} encounter(s) to CSV.`);
  }

  async function openReport(c: MonthChart) {
    const html = await getReportHtmlOrBuild(c.id, c.form);
    printHtml(html);
  }

  function openSuperbill(c: MonthChart) {
    const settings = loadBillingSettings();
    const type = c.form?.plan?.emLevel ? "md" : "pt";
    const lines = buildServiceLines(c.form, settings, type);
    printHtml(buildSuperbillHtml(c.form, lines, settings, type));
  }

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" style={{ width: "min(1040px, 97vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>AHCA Pro Export — Encounter Triage</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>
        <p className="status">
          Last-30-day encounter spreadsheet for the Medical Director's risk review. Export the CSV, identify the
          higher-risk encounters, then pull each selected chart's Report + Superbill to inject into AHCA Pro — the
          audit itself is completed in AHCA Pro. Risk = count of auto-detected deficiencies (billing-vs-note,
          coding, medical necessity, EMC, encounter character, telehealth) per chart.
        </p>

        <div className="grid" style={{ marginBottom: 10 }}>
          <div className="field">
            <label>Review date (prior 30 days)</label>
            <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" onClick={load}>Load encounters</button>
          </div>
        </div>

        {rows && rows.length > 0 && (
          <>
            <div className="toolbar" style={{ margin: "0 0 10px" }}>
              <button className="btn gold" onClick={() => exportCsv(false)}>Download 30-Day CSV ({rows.length})</button>
              <button className="btn ghost" disabled={selected.size === 0} onClick={() => exportCsv(true)}>
                Download Selected CSV ({selected.size})
              </button>
              <span className="status">{status}</span>
            </div>
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Pick</th><th>Risk</th><th>Flags</th><th>Chart</th><th>DOS</th><th>Pt</th>
                  <th>Type</th><th>Mode</th><th>Charge</th><th>Documents</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.chart.id} style={selected.has(r.chart.id) ? { background: "rgba(22,160,133,.15)" } : undefined}>
                    <td><input type="checkbox" checked={selected.has(r.chart.id)} onChange={() => toggle(r.chart.id)} /></td>
                    <td>
                      <span className={`status ${STATUS_CLASS[r.riskStatus]}`} style={{ fontWeight: 700 }}>
                        {r.deficiencies > 0 ? `${r.deficiencies}⚠` : "—"} {r.riskStatus}
                      </span>
                    </td>
                    <td className="status">{r.riskFlags.join(", ") || "—"}</td>
                    <td>{r.chartId}</td>
                    <td>{r.dos}</td>
                    <td>{r.initials}</td>
                    <td>{r.visitType}</td>
                    <td>{r.telehealth ? "TH" : "IP"}</td>
                    <td>{r.chargeTotal ? `$${r.chargeTotal}` : "—"}</td>
                    <td>
                      <button className="btn ghost" style={{ padding: "2px 8px" }} onClick={() => openReport(r.chart)}>Report</button>{" "}
                      <button className="btn ghost" style={{ padding: "2px 8px" }} onClick={() => openSuperbill(r.chart)}>Superbill</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="status">
              Tip: open the Report and Superbill for each higher-risk chart and save/print to inject into AHCA Pro.
              This export is PHI-limited to initials + chart IDs in the spreadsheet; the per-chart documents are the
              full clinical record for the audit.
            </p>
          </>
        )}
        {rows && rows.length === 0 && <p className="status warn">{status}</p>}
        {!rows && <p className="status">{status || "Pick a review date and load the prior 30 days of encounters."}</p>}
      </div>
    </div>
  );
}
