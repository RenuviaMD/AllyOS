import { useEffect, useState } from "react";
import {
  buildGovernanceReportHtml,
  emptyItem,
  itemComplete,
  MAX_CHARTS,
  MIN_CHARTS,
  sampleCharts,
  type ChartReviewItem,
} from "../lib/governance";
import { printHtml } from "../lib/report";
import {
  getGovernanceReviewHtml,
  getReportHtml,
  listGovernanceReviews,
  listReportsForMonth,
  saveGovernanceReview,
  type GovernanceReviewRow,
  type MonthChart,
} from "../lib/store";
import { CLINIC } from "../lib/clinic";

function defaultMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1); // default to the previous month
  return d.toISOString().slice(0, 7);
}

export function GovernancePage(props: { onClose: () => void }) {
  const [month, setMonth] = useState(defaultMonth);
  const [target, setTarget] = useState(MIN_CHARTS);
  const [reviewer, setReviewer] = useState(CLINIC.provider);
  const [pool, setPool] = useState<MonthChart[] | null>(null);
  const [items, setItems] = useState<ChartReviewItem[]>([]);
  const [status, setStatus] = useState("");
  const [history, setHistory] = useState<GovernanceReviewRow[]>([]);

  useEffect(() => {
    listGovernanceReviews().then(setHistory).catch(() => setHistory([]));
  }, []);

  async function loadSample() {
    setStatus("Loading charts…");
    try {
      const charts = await listReportsForMonth(month);
      setPool(charts);
      const sampled = sampleCharts(charts, target);
      setItems(sampled.map(emptyItem));
      setStatus(
        charts.length === 0
          ? "No charts found for this month."
          : charts.length < target
            ? `Only ${charts.length} chart(s) in this period — all will be reviewed.`
            : `Random sample of ${sampled.length} of ${charts.length} charts loaded.`,
      );
    } catch (e) {
      setStatus(`Could not load charts: ${e instanceof Error ? e.message : e}`);
    }
  }

  function update(idx: number, partial: Partial<ChartReviewItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...partial } : it)));
  }

  async function viewChart(reportId: string) {
    const html = await getReportHtml(reportId);
    if (html) printHtml(html);
  }

  const allReviewed = items.length > 0 && items.every(itemComplete);
  const meetsMinimum = pool !== null && items.length >= Math.min(MIN_CHARTS, pool.length) && items.length > 0;

  async function generateBinderReport() {
    if (!allReviewed || !meetsMinimum || !pool) return;
    const html = buildGovernanceReportHtml({
      month,
      targetCount: target,
      totalChartsInMonth: pool.length,
      items,
      reviewer,
    });
    printHtml(html);
    const res = await saveGovernanceReview({ month, targetCount: target, reviewer, items: items as unknown as object[], html });
    setStatus(res.ok ? "Binder report generated and saved to governance records." : `Generated, but save failed: ${res.error}`);
    listGovernanceReviews().then(setHistory).catch(() => {});
  }

  async function openHistory(id: string) {
    const html = await getGovernanceReviewHtml(id);
    if (html) printHtml(html);
  }

  const checks: { key: "documentationComplete" | "codingSupported" | "necessitySupported"; label: string }[] = [
    { key: "documentationComplete", label: "Documentation complete" },
    { key: "codingSupported", label: "ICD/CPT supported by documentation" },
    { key: "necessitySupported", label: "Medical necessity supported" },
  ];

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" style={{ width: "min(900px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Medical Director Governance — Monthly Chart Review</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>
            Close
          </button>
        </div>
        <p className="status">
          Conducted per the Medical Director duties of the Florida Health Care Clinic Act (§ 400.9935, F.S.) — systematic
          review of clinical records and billings. Minimum {MIN_CHARTS} charts per month, up to {MAX_CHARTS} at the Medical
          Director's discretion. The PDF report is for the AHCA compliance binder.
        </p>

        <div className="grid" style={{ marginBottom: 10 }}>
          <div className="field">
            <label>Review month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="field">
            <label>Charts to review ({MIN_CHARTS}–{MAX_CHARTS})</label>
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {Array.from({ length: MAX_CHARTS - MIN_CHARTS + 1 }, (_, i) => MIN_CHARTS + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Medical Director</label>
            <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" onClick={loadSample}>
              Load random sample
            </button>
          </div>
        </div>

        {items.map((it, idx) => (
          <div key={it.reportId} className="section" style={{ marginBottom: 10 }}>
            <div className="section-head">
              <span className="section-num">{idx + 1}</span>
              <span className="section-title">
                {it.patientLabel} — {it.dos} — {it.mode}
                {it.telehealthCompliant !== null ? " — TELEHEALTH" : ""}
              </span>
              <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => viewChart(it.reportId)}>
                View chart
              </button>
            </div>
            <div className="section-body">
              <div className="checkgroup">
                {checks.map((c) => (
                  <label key={c.key} className={it[c.key] ? "checked" : ""}>
                    <input type="checkbox" checked={it[c.key]} onChange={() => update(idx, { [c.key]: !it[c.key] } as Partial<ChartReviewItem>)} />
                    {c.label}
                  </label>
                ))}
                {it.telehealthCompliant !== null && (
                  <label className={it.telehealthCompliant ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={it.telehealthCompliant}
                      onChange={() => update(idx, { telehealthCompliant: !it.telehealthCompliant })}
                    />
                    Telehealth consent & origination statement present
                  </label>
                )}
              </div>
              <div className="grid" style={{ marginTop: 8 }}>
                <div className="field">
                  <label>Finding</label>
                  <select value={it.finding} onChange={(e) => update(idx, { finding: e.target.value as ChartReviewItem["finding"] })}>
                    <option value="">— select —</option>
                    <option value="compliant">Compliant</option>
                    <option value="minor">Minor deficiency</option>
                    <option value="significant">Significant deficiency</option>
                  </select>
                </div>
                <div className="field grid-wide">
                  <label>Comments / corrective action</label>
                  <input value={it.comments} onChange={(e) => update(idx, { comments: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="toolbar" style={{ margin: "10px 0" }}>
          <button className="btn gold" disabled={!allReviewed || !meetsMinimum} onClick={generateBinderReport}>
            Generate AHCA Binder Report (PDF)
          </button>
          <span className="status">{status}</span>
        </div>

        {history.length > 0 && (
          <>
            <h3 className="exam-h">Past reviews</h3>
            <table className="rom-table">
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.review_month}</td>
                    <td>{h.target_count} charts</td>
                    <td>{h.reviewer}</td>
                    <td>{h.created_at.slice(0, 10)}</td>
                    <td>
                      <button className="btn ghost" onClick={() => openHistory(h.id)}>
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
