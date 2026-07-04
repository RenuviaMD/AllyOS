import { useEffect, useState } from "react";
import {
  buildCaseIndex,
  caseActionItems,
  caseTimeline,
  filterGroups,
  groupCasesByPatient,
  isClinicalMode,
  type CaseEntry,
} from "../lib/cases";
import { groupPackageDocs } from "../lib/today";
import { fetchReportsByIds, getReportHtml, listPackageDocReports, listReportMeta } from "../lib/store";
import { printHtml } from "../lib/report";
import { daysSinceAccident } from "../lib/weeks";

/**
 * Patients registry — one record per person, one case per accident event
 * (name + DOB + DOA), with status badges derived strictly from what is
 * documented. Opens the Case Detail overlay (Overview / Timeline /
 * Documents / Billing, UX Blueprint U5).
 */

const STATUS_CLASS: Record<string, string> = {
  Intake: "st-intake",
  Active: "st-active",
  "In Treatment": "st-treatment",
  Discharged: "st-discharged",
};

const EMC_CLASS: Record<string, string> = {
  Certified: "emc-yes",
  "Not Certified": "emc-no",
  Pending: "emc-pending",
  "—": "",
};

export function PatientsPage(props: { initialQuery?: string }) {
  const [query, setQuery] = useState(props.initialQuery ?? "");
  const [cases, setCases] = useState<CaseEntry[] | null>(null);
  const [packetDocs, setPacketDocs] = useState<Record<string, Record<string, string[]>>>({});
  const [error, setError] = useState("");
  const [openCase, setOpenCase] = useState<CaseEntry | null>(null);

  useEffect(() => {
    listReportMeta()
      .then((rows) => setCases(buildCaseIndex(rows)))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    listPackageDocReports().then((rows) => setPacketDocs(groupPackageDocs(rows)));
  }, []);

  const groups = cases ? filterGroups(groupCasesByPatient(cases), query) : [];

  return (
    <div className="patients">
      <div className="today-head">
        <div>
          <h2 className="today-title">Patients</h2>
          <div className="status">
            One record per person; one case per accident event. A patient with more than one accident has more than one case.
          </div>
        </div>
      </div>
      <div className="field" style={{ maxWidth: 380, marginBottom: 14 }}>
        <label>Search — last name, first name, or phone digits</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing…" />
      </div>
      {error && <p className="status warn">Could not load patients: {error}</p>}
      {cases === null && !error && <p className="status">Loading patients…</p>}
      {cases !== null && groups.length === 0 && (
        <div className="today-empty">
          <p>{query ? "No patients match the search." : "No patients yet — they appear here once a first document is saved."}</p>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.patientKey} className="pat-group">
          <div className="pat-head">
            <span className="today-name">{g.name}</span>
            <span className="status">
              {g.dob && `DOB ${g.dob}`}
              {g.phone && ` · ${g.phone}`}
              {` · ${g.cases.length} case${g.cases.length === 1 ? "" : "s"}`}
            </span>
          </div>
          {g.cases.map((c) => (
            <div key={c.key} className="case-row">
              <span className="case-doa">DOA {c.accidentDate || "—"}</span>
              <span className={`badge-status ${STATUS_CLASS[c.status]}`}>{c.status}</span>
              {c.emc !== "—" && <span className={`badge-status ${EMC_CLASS[c.emc]}`}>EMC {c.emc}</span>}
              <span className="status">
                {c.carrier || "carrier —"}
                {c.claimNumber && ` · claim ${c.claimNumber}`}
              </span>
              <span className="status">
                {c.visitCounts.initial + c.visitCounts.followup + c.visitCounts.final} MD · {c.visitCounts.pt} PT
                {c.lastDos && ` · last ${c.lastDos}`}
              </span>
              <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setOpenCase(c)}>
                Open →
              </button>
            </div>
          ))}
        </div>
      ))}
      {openCase && (
        <CaseDetail
          c={openCase}
          packetDocs={packetDocs[openCase.patientKey]}
          onClose={() => setOpenCase(null)}
        />
      )}
    </div>
  );
}

type Tab = "overview" | "timeline" | "documents" | "billing";

export function CaseDetail(props: { c: CaseEntry; packetDocs: Record<string, string[]> | undefined; onClose: () => void }) {
  const { c } = props;
  const [tab, setTab] = useState<Tab>("overview");
  const [billing, setBilling] = useState<{ id: string; mode: string; dos: string; cpt: string[] }[] | null>(null);
  const [status, setStatus] = useState("");

  const actions = caseActionItems(c, props.packetDocs);
  const timeline = caseTimeline(c);
  const latest = c.latestForm;
  const clinicalIds = c.reports.filter((r) => isClinicalMode(r.mode) || r.mode.startsWith("pt")).map((r) => r.id);

  useEffect(() => {
    if (tab !== "billing" || billing !== null || clinicalIds.length === 0) return;
    fetchReportsByIds(clinicalIds)
      .then((rows) => setBilling(rows.map(({ id, mode, dos, cpt }) => ({ id, mode, dos, cpt }))))
      .catch(() => setBilling([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function view(id: string) {
    const html = await getReportHtml(id);
    if (!html) setStatus("Could not load the document.");
    else if (!printHtml(html)) setStatus("Print window was blocked — allow pop-ups and try again.");
    else setStatus("");
  }

  const clinical = c.latestClinicalForm;
  const dxCodes = [
    ...(clinical?.assessment?.autoCodes ?? []),
    ...(clinical?.assessment?.extraCodes ?? []),
  ];

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal case-detail" onClick={(e) => e.stopPropagation()}>
        <div className="case-detail-head">
          <div>
            <h2 style={{ margin: 0, color: "var(--gold)" }}>{c.name}</h2>
            <span className="status">
              {c.dob && `DOB ${c.dob} · `}DOA {c.accidentDate || "—"}
              {c.lastDos && ` · Day ${daysSinceAccident(c.accidentDate, c.lastDos)} at last visit`}
            </span>
          </div>
          <span className={`badge-status ${STATUS_CLASS[c.status]}`}>{c.status}</span>
          {c.emc !== "—" && <span className={`badge-status ${EMC_CLASS[c.emc]}`}>EMC {c.emc}</span>}
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>
            ← Back
          </button>
        </div>

        <div className="seg" style={{ marginBottom: 14 }}>
          {(["overview", "timeline", "documents", "billing"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t === "overview" ? "Overview" : t === "timeline" ? "Timeline" : t === "documents" ? "Documents" : "Billing"}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="case-cards">
            <div className="case-card">
              <h4>Patient</h4>
              <p>{c.name}</p>
              <p className="status">
                {c.dob && `DOB ${c.dob}`}
                {c.phone && ` · ${c.phone}`}
              </p>
              {latest?.patient?.address && (
                <p className="status">
                  {latest.patient.address}, {latest.patient.city} {latest.patient.state} {latest.patient.zip}
                </p>
              )}
            </div>
            <div className="case-card">
              <h4>Insurance</h4>
              <p>{c.carrier || "—"}</p>
              <p className="status">
                {latest?.patient?.policyNumber && `Policy ${latest.patient.policyNumber} · `}
                {c.claimNumber ? `Claim ${c.claimNumber}` : "Claim # —"}
              </p>
              <p>
                {c.emc !== "—" && <span className={`badge-status ${EMC_CLASS[c.emc]}`}>EMC {c.emc}</span>}
              </p>
            </div>
            <div className="case-card">
              <h4>Clinical</h4>
              <p className="status">
                {c.visitCounts.initial} initial · {c.visitCounts.followup} follow-up · {c.visitCounts.final} final ·{" "}
                {c.visitCounts.pt} PT
              </p>
              {dxCodes.length > 0 && (
                <p className="status">Dx: {dxCodes.slice(0, 6).map((d) => d.code).join(", ")}{dxCodes.length > 6 ? "…" : ""}</p>
              )}
              {clinical?.plan?.ptFrequency && (
                <p className="status">PT {clinical.plan.ptFrequency} × {clinical.plan.ptDuration}</p>
              )}
            </div>
            <div className="case-card">
              <h4>Case</h4>
              <p className="status">Accident {c.accidentDate || "—"} ({latest?.accident?.accidentType || "type —"})</p>
              <p className="status">
                {c.reports.length} document{c.reports.length === 1 ? "" : "s"}
                {c.lastDos && ` · last DOS ${c.lastDos}`}
              </p>
            </div>
          </div>
        )}

        {tab === "timeline" && (
          <div>
            {actions.length > 0 && (
              <div className="case-actions">
                {actions.map((a) => (
                  <span key={a.kind} className="today-packet todo">
                    ⚠ {a.label}
                  </span>
                ))}
              </div>
            )}
            {actions.length === 0 && <p className="status ok">No pending action items on this case.</p>}
            <table className="rom-table">
              <thead>
                <tr>
                  <th>Date of Service</th>
                  <th>Document</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.dos} {t.time && <span className="status">{t.time}</span>}
                    </td>
                    <td>{t.title}</td>
                    <td>
                      <button className="btn ghost" onClick={() => view(t.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "documents" && (
          <table className="rom-table">
            <thead>
              <tr>
                <th>Date of Service</th>
                <th>Document</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...timeline].reverse().map((t) => (
                <tr key={t.id}>
                  <td>{t.dos}</td>
                  <td>{t.title}</td>
                  <td>
                    <button className="btn ghost" onClick={() => view(t.id)}>
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "billing" && (
          <div>
            <p className="status">
              Codes billed per documented visit. Superbill and CMS-1500 print from the encounter; this is the case ledger.
            </p>
            {clinicalIds.length === 0 && <p className="status">No billable visits documented yet.</p>}
            {clinicalIds.length > 0 && billing === null && <p className="status">Loading…</p>}
            {billing && billing.length > 0 && (
              <table className="rom-table">
                <thead>
                  <tr>
                    <th>Date of Service</th>
                    <th>Visit</th>
                    <th>CPT</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.map((b) => (
                    <tr key={b.id}>
                      <td>{b.dos}</td>
                      <td>{b.mode}</td>
                      <td>{b.cpt.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {status && <p className="status warn">{status}</p>}
      </div>
    </div>
  );
}
