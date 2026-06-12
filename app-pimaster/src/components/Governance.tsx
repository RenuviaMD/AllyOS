import { useEffect, useState } from "react";
import {
  AUDIT_POINTS,
  autoEvaluate,
  buildGovernanceReportHtml,
  chartScore,
  itemComplete,
  MAX_CHARTS,
  MIN_CHARTS,
  sampleCharts,
  statusFor,
  type ChartReviewItem,
  type PointValue,
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
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

const STATUS_CLASS: Record<string, string> = {
  PASS: "ok",
  MONITOR: "",
  CORRECTIVE: "warn",
  ESCALATION: "warn",
};

export function GovernancePage(props: { onClose: () => void }) {
  const [month, setMonth] = useState(defaultMonth);
  const [target, setTarget] = useState(MIN_CHARTS);
  const [reviewer, setReviewer] = useState(CLINIC.provider);
  const [followUp, setFollowUp] = useState("");
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
      setItems(
        sampled.map((c) => ({
          reportId: c.id,
          patientInitials: c.patient_initials,
          dos: c.dos,
          mode: c.mode,
          telehealth: c.telehealth,
          evaluation: autoEvaluate(c.form, c.cpt_codes, c.icd_codes),
          mdOverrides: [],
          comments: "",
        })),
      );
      setStatus(
        charts.length === 0
          ? "No charts found for this month."
          : `Random sample of ${Math.min(target, charts.length)} of ${charts.length} encounters loaded and pre-evaluated. Review each point — your changes are recorded as MD overrides.`,
      );
    } catch (e) {
      setStatus(`Could not load charts: ${e instanceof Error ? e.message : e}`);
    }
  }

  function setPoint(idx: number, pointId: string, value: PointValue) {
    setItems((arr) =>
      arr.map((it, i) => {
        if (i !== idx) return it;
        const overrides = it.mdOverrides.includes(pointId) ? it.mdOverrides : [...it.mdOverrides, pointId];
        return {
          ...it,
          mdOverrides: overrides,
          evaluation: { ...it.evaluation, [pointId]: { value, reason: `${it.evaluation[pointId]?.reason ?? ""} [MD override]`.trim() } },
        };
      }),
    );
  }

  function setComments(idx: number, comments: string) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, comments } : it)));
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
      followUp,
    });
    printHtml(html);
    const res = await saveGovernanceReview({ month, targetCount: target, reviewer, items: items as unknown as object[], html });
    setStatus(res.ok ? "AHCA audit report generated and saved to governance records." : `Generated, but save failed: ${res.error}`);
    listGovernanceReviews().then(setHistory).catch(() => {});
  }

  async function openHistory(id: string) {
    const html = await getGovernanceReviewHtml(id);
    if (html) printHtml(html);
  }

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" style={{ width: "min(980px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Medical Director Governance — AHCA Chart Audit</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>
            Close
          </button>
        </div>
        <p className="status">
          § 400.9935 F.S. systematic review: billing matched against the note, provider authority, and documentation
          standards. Each chart is pre-evaluated point-by-point (Y/N/NA); the Medical Director confirms or overrides.
          Minimum {MIN_CHARTS}, up to {MAX_CHARTS} charts per month.
        </p>

        <div className="grid" style={{ marginBottom: 10 }}>
          <div className="field">
            <label>Review month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="field">
            <label>Charts ({MIN_CHARTS}–{MAX_CHARTS})</label>
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {Array.from({ length: MAX_CHARTS - MIN_CHARTS + 1 }, (_, i) => MIN_CHARTS + i).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Medical Director</label>
            <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
          </div>
          <div className="field">
            <label>&nbsp;</label>
            <button className="btn" onClick={loadSample}>Load & pre-evaluate sample</button>
          </div>
        </div>

        {items.map((it, idx) => {
          const score = chartScore(it.evaluation);
          const st = statusFor(score.pct);
          return (
            <div key={it.reportId} className="section" style={{ marginBottom: 10 }}>
              <div className="section-head">
                <span className="section-num">{idx + 1}</span>
                <span className="section-title">
                  {it.patientInitials} [{it.reportId.slice(0, 8)}] — {it.dos} — {it.mode}
                  {it.telehealth ? " — TELEHEALTH" : ""}
                </span>
                <span className={`status ${STATUS_CLASS[st]}`} style={{ marginLeft: "auto", fontWeight: 700 }}>
                  {score.pct === null ? "—" : `${score.pct}%`} · {st}
                </span>
                <button className="btn ghost" onClick={() => viewChart(it.reportId)}>View chart</button>
              </div>
              <div className="section-body">
                <table className="rom-table">
                  <tbody>
                    {AUDIT_POINTS.map((p) => {
                      const r = it.evaluation[p.id];
                      return (
                        <tr key={p.id}>
                          <td style={{ width: "42%" }}>{p.label}</td>
                          <td style={{ width: 160 }}>
                            <div className="rom-grades">
                              {(["Y", "N", "NA"] as PointValue[]).map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  className={`${v === "Y" ? "g-wnl" : v === "N" ? "g-cannot" : "g-limited"}${r?.value === v ? " sel" : ""}`}
                                  onClick={() => setPoint(idx, p.id, v)}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="status">
                            {r?.reason}
                            {it.mdOverrides.includes(p.id) ? " ✱" : p.auto ? "" : " (manual review)"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="field" style={{ marginTop: 8 }}>
                  <label>Comments / corrective action</label>
                  <input value={it.comments} onChange={(e) => setComments(idx, e.target.value)} />
                </div>
              </div>
            </div>
          );
        })}

        {items.length > 0 && (
          <div className="field" style={{ margin: "10px 0" }}>
            <label>Follow-up / corrective action plan (prints on the report)</label>
            <textarea
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              style={{ width: "100%", background: "var(--hover)", border: "1px solid #46627f", color: "var(--text)", borderRadius: 4, padding: 8 }}
            />
          </div>
        )}

        <div className="toolbar" style={{ margin: "10px 0" }}>
          <button className="btn gold" disabled={!allReviewed || !meetsMinimum} onClick={generateBinderReport}>
            Generate AHCA Audit Report (PDF)
          </button>
          <span className="status">{status}</span>
        </div>

        {history.length > 0 && (
          <>
            <h3 className="exam-h">Past audits</h3>
            <table className="rom-table">
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.review_month}</td>
                    <td>{h.target_count} charts</td>
                    <td>{h.reviewer}</td>
                    <td>{h.created_at.slice(0, 10)}</td>
                    <td>
                      <button className="btn ghost" onClick={() => openHistory(h.id)}>View / Print</button>
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
