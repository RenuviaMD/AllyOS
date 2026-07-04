import { useEffect, useState } from "react";
import { applicableDocs, combineDocsHtml, packageReadiness, pdfTrackingHtml, type PackageDocDef } from "../lib/packageDocs";
import { printHtml } from "../lib/report";
import { getReportHtml, listPatientDocKinds, saveReport, type ReportMode } from "../lib/store";
import type { VisitForm } from "../lib/types";

/**
 * Visit Documents: the intake/legal package generated beside the clinical
 * note. Front desk prints the patient-signature packet at check-in; the
 * physician generates the sworn affidavit. Every document prints pre-filled —
 * no handwritten patient fields. Once-per-patient documents show as done on
 * later visits and are not regenerated.
 */
export function PackagePanel(props: { form: VisitForm; role: string; onClose: () => void }) {
  const { form, role } = props;
  const [existing, setExisting] = useState<Record<string, { dos: string; id: string }>>({});
  const [status, setStatus] = useState("");

  const missing = packageReadiness(form);
  const docs = applicableDocs(form);
  const canProduce = (d: PackageDocDef) => (d.producer === "physician" ? role === "physician" : true);
  const alreadyDone = (d: PackageDocDef) => d.oncePerPatient && !!existing[d.kind];

  function refresh() {
    listPatientDocKinds(form.patient.firstName, form.patient.lastName, form.patient.dob).then(setExisting);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [form.patient.firstName, form.patient.lastName, form.patient.dob]);

  async function produce(list: PackageDocDef[]) {
    const todo = list.filter((d) => canProduce(d) && !alreadyDone(d));
    if (todo.length === 0) {
      setStatus("Nothing to generate — already signed or not applicable.");
      return;
    }
    // Official state PDFs open as-is in their own tab; pre-filled forms print combined.
    const pdfDocs = todo.filter((d) => d.pdfUrl);
    const htmlDocs = todo.filter((d) => !d.pdfUrl);
    for (const d of pdfDocs) {
      if (!window.open(d.pdfUrl, "_blank")) {
        setStatus("The official form window was blocked — allow pop-ups and try again.");
        return;
      }
    }
    const htmls = htmlDocs.map((d) => d.build!(form));
    if (htmls.length > 0 && !printHtml(combineDocsHtml(htmls))) {
      setStatus("Print window was blocked — allow pop-ups and try again.");
      return;
    }
    for (const d of todo) {
      const res = await saveReport({
        mode: d.kind as ReportMode,
        dos: form.visitDate,
        form,
        html: d.pdfUrl ? pdfTrackingHtml(d, form) : d.build!(form),
        icdCodes: [],
        cptCodes: [],
      });
      if (!res.ok) {
        setStatus(`Printed, but saving ${d.title} failed: ${res.error}`);
        refresh();
        return;
      }
    }
    setStatus(`${todo.length} document${todo.length > 1 ? "s" : ""} printed and saved to the archive.`);
    refresh();
  }

  /** Print an exact copy of the already-signed document from the archive.
   * Official state PDFs always reopen the PDF itself — never a reproduction. */
  async function reprint(d: PackageDocDef) {
    const saved = existing[d.kind];
    if (!saved) return;
    if (d.pdfUrl) {
      if (!window.open(d.pdfUrl, "_blank")) setStatus("The official form window was blocked — allow pop-ups and try again.");
      else setStatus(`${d.title}: official PDF opened (signed original of ${saved.dos} is on paper).`);
      return;
    }
    const html = await getReportHtml(saved.id);
    if (!html) {
      setStatus("Could not load the saved copy — check the Reports Archive.");
      return;
    }
    if (!printHtml(html)) setStatus("Print window was blocked — allow pop-ups and try again.");
    else setStatus(`${d.title}: copy reprinted from the archive (original of ${saved.dos}).`);
  }

  const staffDocs = docs.filter((d) => d.producer === "staff");
  const mdDocs = docs.filter((d) => d.producer === "physician");

  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(760px, 95vw)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Visit Documents</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>
        <p className="status">
          Prints pre-filled from the visit data — no handwritten fields. One-time documents (AOB, releases, affidavit)
          are signed at the first visit and marked done afterwards. Each print is saved to the Reports Archive.
        </p>
        {missing.length > 0 && (
          <p className="status warn">⛔ Enter {missing.join(", ")} (Sections 1–2) before generating documents.</p>
        )}
        <table className="rom-table">
          <thead>
            <tr><th>Document</th><th>Signed by</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.kind} style={{ opacity: alreadyDone(d) ? 0.6 : 1 }}>
                <td>{d.title}{d.oncePerPatient && <div className="status">once per patient — first visit</div>}</td>
                <td>{d.signer}</td>
                <td>{existing[d.kind] ? `✓ ${existing[d.kind].dos}` : "—"}</td>
                <td>
                  {canProduce(d) && !alreadyDone(d) && (
                    <button className="btn ghost" disabled={missing.length > 0} onClick={() => produce([d])}>
                      Print &amp; Save
                    </button>
                  )}
                  {existing[d.kind] && (
                    <button className="btn ghost" onClick={() => reprint(d)}>
                      Reprint copy
                    </button>
                  )}
                  {!canProduce(d) && !existing[d.kind] && <span className="status">physician</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="toolbar" style={{ margin: "14px 0 0" }}>
          {staffDocs.some((d) => !alreadyDone(d)) && (
            <button className="btn gold" disabled={missing.length > 0} onClick={() => produce(staffDocs)}>
              Print Front-Desk Packet
            </button>
          )}
          {role === "physician" && mdDocs.some((d) => !alreadyDone(d)) && (
            <button className="btn" disabled={missing.length > 0} onClick={() => produce(mdDocs)}>
              Print MD Documents
            </button>
          )}
          <span className="status">{status}</span>
        </div>
      </div>
    </div>
  );
}
