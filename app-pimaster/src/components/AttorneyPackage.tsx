import { useEffect, useState } from "react";
import { buildAttorneyPackageHtml, groupPatients, MODE_LABELS, type AttorneyInfo, type PatientGroup } from "../lib/attorney";
import { loadBillingSettings } from "../lib/billing";
import { printHtml } from "../lib/report";
import { fetchReportsByIds, listReportMeta, logDisclosure } from "../lib/store";
import { Text } from "./fields";

export function AttorneyPackagePage(props: { onClose: () => void; generatedBy: string }) {
  const [groups, setGroups] = useState<PatientGroup[] | null>(null);
  const [selected, setSelected] = useState<PatientGroup | null>(null);
  const [attorney, setAttorney] = useState<AttorneyInfo>({ name: "", firm: "", address: "" });
  const [authOnFile, setAuthOnFile] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listReportMeta()
      .then((rows) => setGroups(groupPatients(rows)))
      .catch((e) => setStatus(`Could not load cases: ${e instanceof Error ? e.message : e}`));
  }, []);

  const ready = selected && authOnFile && attorney.name.trim();

  async function generate() {
    if (!selected || !ready) return;
    setBusy(true);
    setStatus("Assembling package…");
    try {
      const docs = await fetchReportsByIds(selected.reportIds);
      const html = buildAttorneyPackageHtml({
        patient: { name: selected.name, dob: selected.dob, accidentDate: selected.accidentDate },
        attorney,
        docs,
        settings: loadBillingSettings(),
        generatedBy: props.generatedBy,
      });
      const opened = printHtml(html);
      await logDisclosure({
        patient_initials: selected.name
          .split(/\s+/)
          .map((w) => (w ? `${w[0].toUpperCase()}.` : ""))
          .join(""),
        dob: selected.dob,
        accident_date: selected.accidentDate,
        report_ids: selected.reportIds,
        document_count: docs.length,
        attorney: attorney.name,
        firm: attorney.firm,
        authorization_on_file: true,
        generated_by: props.generatedBy,
      });
      setStatus(
        opened
          ? `Package assembled (${docs.length} documents) — disclosure logged.`
          : "Package assembled, but the print window was blocked — allow pop-ups and generate again.",
      );
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(880px, 96vw)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Attorney Records Package</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>
        <p className="status">
          Compiles the patient's complete case — cover letter, table of contents, face sheet, every note, itemized
          billing ledger, and the records-custodian certification — into one printable package. This is a full-PHI
          release to the patient's attorney: it requires the patient's written authorization on file and every
          generation is recorded in the disclosure log.
        </p>

        {!groups && <p className="status">{status || "Loading cases…"}</p>}
        {groups && groups.length === 0 && <p className="status warn">No documented cases found.</p>}

        {groups && groups.length > 0 && (
          <>
            <h3 className="exam-h">1 — Select the patient case</h3>
            <table className="rom-table">
              <thead>
                <tr><th></th><th>Patient</th><th>DOB</th><th>Accident</th><th>Documents</th><th>Treatment period</th></tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr
                    key={g.key}
                    style={selected?.key === g.key ? { background: "rgba(22,160,133,.18)" } : undefined}
                    onClick={() => setSelected(g)}
                  >
                    <td><input type="radio" checked={selected?.key === g.key} onChange={() => setSelected(g)} /></td>
                    <td>{g.name}</td>
                    <td>{g.dob || "—"}</td>
                    <td>{g.accidentDate || "—"}</td>
                    <td>{g.reportIds.length} ({[...new Set(g.modes)].map((m) => MODE_LABELS[m]?.split(" ")[0] ?? m).join(", ")})</td>
                    <td>{g.firstDos} → {g.lastDos}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selected && (
              <>
                <h3 className="exam-h">2 — Delivery details</h3>
                <div className="grid">
                  <Text label="Attorney name — REQUIRED" value={attorney.name} onChange={(v) => setAttorney({ ...attorney, name: v })} />
                  <Text label="Law firm" value={attorney.firm} onChange={(v) => setAttorney({ ...attorney, firm: v })} />
                  <Text label="Firm address" value={attorney.address} onChange={(v) => setAttorney({ ...attorney, address: v })} wide />
                </div>

                <h3 className="exam-h">3 — Authorization</h3>
                <div className="checkgroup" style={{ maxWidth: 620 }}>
                  <label className={authOnFile ? "checked" : ""}>
                    <input type="checkbox" checked={authOnFile} onChange={() => setAuthOnFile(!authOnFile)} />
                    I confirm the patient's written authorization for release of these records to the attorney above is
                    on file at the clinic. — REQUIRED
                  </label>
                </div>

                <div className="toolbar" style={{ margin: "14px 0 0" }}>
                  <button className="btn gold" disabled={!ready || busy} onClick={generate}>
                    {busy ? "Assembling…" : `Generate Package (${selected.reportIds.length} documents)`}
                  </button>
                  <span className="status">{status}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
