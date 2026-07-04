import { useEffect, useState } from "react";
import { buildServiceLines, loadBillingSettings } from "../lib/billing";
import {
  auditPackage,
  buildVisitBatches,
  fullForm,
  MD_MODES,
  PACKAGE_STATUS_LABELS,
  packageManifest,
  type PackageAudit,
  type PackageStatus,
  type VisitBatch,
} from "../lib/billingPackage";
import { buildCaseIndex, type CaseEntry } from "../lib/cases";
import { CLINIC } from "../lib/clinic";
import { combineDocsHtml } from "../lib/packageDocs";
import {
  allCptCodes,
  allDiagnosisCodes,
  buildCms1500Html,
  buildPackageCoverHtml,
  buildSuperbillHtml,
  downloadFile,
  printHtml,
} from "../lib/report";
import {
  fetchVisitRowsByIds,
  listBillingPackages,
  listCarriers,
  listReportMeta,
  saveBillingPackage,
  updateBillingPackageStatus,
  type BillingPackageRow,
} from "../lib/store";
import { MODE_TITLES } from "../lib/today";

/**
 * Insurance Billing Packages — the batch-and-audit layer. PIP carriers accept
 * MAILED paper claims only: a batch (8 visits) is audited (hard stops block,
 * warnings show), then prints as one bundle — cover sheet with the carrier's
 * claims mailing address, every archived visit note, and a superbill +
 * CMS-1500 rebuilt from each visit's saved snapshot. The package can also be
 * downloaded and emailed to the clinic's own inbox for front-desk printing.
 */
export function BillingPackagesPage(props: { onClose: () => void }) {
  const [cases, setCases] = useState<CaseEntry[] | null>(null);
  const [selected, setSelected] = useState<CaseEntry | null>(null);
  const [packages, setPackages] = useState<BillingPackageRow[]>([]);
  const [carrierAddress, setCarrierAddress] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<{ batch: number; result: PackageAudit } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function refreshPackages() {
    listBillingPackages().then(setPackages);
  }

  useEffect(() => {
    listReportMeta()
      .then((rows) => setCases(buildCaseIndex(rows).filter((c) => c.visitCounts.initial + c.visitCounts.followup + c.visitCounts.final + c.visitCounts.pt > 0)))
      .catch((e) => setStatus(`Could not load cases: ${e instanceof Error ? e.message : e}`));
    listCarriers()
      .then((rows) => {
        const map: Record<string, string> = {};
        for (const r of rows) if (r.claims_address) map[r.name.toLowerCase()] = r.claims_address;
        setCarrierAddress(map);
      })
      .catch(() => {});
    refreshPackages();
  }, []);

  const batches: VisitBatch[] = selected ? buildVisitBatches(selected.reports) : [];

  function claimsAddressFor(c: CaseEntry): string {
    return (
      (c.latestClinicalForm?.patient?.insurerAddress ?? "").trim() ||
      carrierAddress[c.carrier.toLowerCase()] ||
      ""
    );
  }

  /** Latest package row for a batch (a rebuilt batch supersedes older rows). */
  function packageFor(c: CaseEntry, batchIndex: number): BillingPackageRow | undefined {
    return [...packages].reverse().find((p) => p.caseKey === c.key && p.batchIndex === batchIndex);
  }

  function runAudit(batch: VisitBatch) {
    if (!selected) return;
    const result = auditPackage(batch.visits, loadBillingSettings(), claimsAddressFor(selected));
    setAudit({ batch: batch.index, result });
    setStatus(
      result.stops.length > 0
        ? `Audit: ${result.stops.length} hard stop${result.stops.length > 1 ? "s" : ""} — the package is blocked until resolved.`
        : `Audit clean${result.warnings.length ? ` (${result.warnings.length} warning${result.warnings.length > 1 ? "s" : ""})` : ""} — ready to build.`,
    );
  }

  async function assemble(batch: VisitBatch): Promise<{ combined: string; cover: string } | null> {
    if (!selected) return null;
    const settings = loadBillingSettings();
    const rows = await fetchVisitRowsByIds(batch.visits.map((v) => v.id));
    const latestClinical = [...rows].reverse().find((r) => MD_MODES.has(r.mode))?.form ?? rows[rows.length - 1]?.form;
    const f = fullForm(latestClinical ?? null);
    const auditRes = auditPackage(batch.visits, settings, claimsAddressFor(selected));
    const cover = buildPackageCoverHtml({
      form: f,
      batchIndex: batch.index,
      visits: batch.visits.map((v) => ({ dos: v.dos, label: MODE_TITLES[v.mode] ?? v.mode })),
      claimsAddress: claimsAddressFor(selected),
      totalBilled: auditRes.totalBilled,
      manifest: packageManifest(batch.visits),
      emc: selected.emc,
    });
    const parts: string[] = [cover];
    for (const r of rows) {
      if (r.html) parts.push(r.html);
      const vf = fullForm(r.form);
      if (MD_MODES.has(r.mode)) {
        const lines = buildServiceLines(vf, settings, "md");
        if (lines.length > 0) {
          parts.push(buildSuperbillHtml(vf, lines, settings, "md"));
          parts.push(buildCms1500Html(vf, lines, settings));
        }
      } else if (r.mode === "ptdaily") {
        const lines = buildServiceLines(vf, settings, "pt");
        if (lines.length > 0) {
          parts.push(buildSuperbillHtml(vf, lines, settings, "pt"));
          parts.push(buildCms1500Html(vf, lines, settings));
        }
      }
    }
    return { combined: combineDocsHtml(parts), cover };
  }

  async function buildAndPrint(batch: VisitBatch) {
    if (!selected) return;
    const result = auditPackage(batch.visits, loadBillingSettings(), claimsAddressFor(selected));
    setAudit({ batch: batch.index, result });
    if (result.stops.length > 0) {
      setStatus("Blocked — resolve the hard stops listed below, then build again.");
      return;
    }
    setBusy(true);
    setStatus("Assembling package…");
    try {
      const out = await assemble(batch);
      if (!out) return;
      const opened = printHtml(out.combined);
      const f = fullForm(selected.latestClinicalForm ?? null);
      const res = await saveBillingPackage({
        dos: batch.lastDos,
        form: f,
        coverHtml: out.cover,
        icdCodes: allDiagnosisCodes(f).map((d) => d.code),
        cptCodes: allCptCodes(f),
        caseKey: selected.key,
        batchIndex: batch.index,
        visitIds: batch.visits.map((v) => v.id),
      });
      refreshPackages();
      setStatus(
        res.ok
          ? opened
            ? `Batch ${batch.index} package printed and archived — mark it Sent once mailed.`
            : "Package archived, but the print window was blocked — allow pop-ups and use Reprint."
          : `Package printed, but archiving failed: ${res.error}`,
      );
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function reprint(batch: VisitBatch) {
    setBusy(true);
    try {
      const out = await assemble(batch);
      if (out && !printHtml(out.combined)) setStatus("Print window was blocked — allow pop-ups and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function download(batch: VisitBatch) {
    setBusy(true);
    try {
      const out = await assemble(batch);
      if (!out || !selected) return;
      downloadFile(
        `billing-package-batch${batch.index}-${selected.last.toLowerCase() || "patient"}.html`,
        out.combined,
        "text/html;charset=utf-8",
      );
      setStatus("Package downloaded — attach it to the email to the clinic, or open and print.");
    } finally {
      setBusy(false);
    }
  }

  /** Opens the user's mail client addressed to the clinic's own inbox (from onboarding). PHI-light body. */
  function emailToClinic(batch: VisitBatch) {
    if (!selected) return;
    const initials = selected.name
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((w) => `${w[0].toUpperCase()}.`)
      .join("");
    const subject = `PIP billing package — ${initials} batch ${batch.index} (${batch.firstDos} to ${batch.lastDos})`;
    const body =
      `Billing package for chart ${initials}, batch ${batch.index}.\n` +
      `Attach the downloaded package file, print it, and MAIL the paper package to:\n${claimsAddressFor(selected) || "(carrier claims address — see Catalogs → Carriers)"}\n\n` +
      `Carrier: ${selected.carrier || "—"} · Visits ${batch.firstDos} to ${batch.lastDos} (${batch.visits.length}).`;
    window.location.href = `mailto:${CLINIC.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus(`Email draft opened to ${CLINIC.email} — attach the downloaded package file.`);
  }

  async function setPkgStatus(row: BillingPackageRow, s: PackageStatus) {
    const res = await updateBillingPackageStatus(row.id, s);
    if (!res.ok) setStatus(`Could not update status: ${res.error}`);
    refreshPackages();
  }

  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(1000px, 96vw)", maxHeight: "90vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Insurance Billing Packages</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>
        <p className="status">
          PIP carriers accept mailed paper claims only. Each 8-visit batch is audited first (hard stops block the
          build), then prints as one bundle: cover sheet with the carrier's claims mailing address, every visit note,
          and a superbill + CMS-1500 per billable visit. Download to email the package to the clinic inbox
          ({CLINIC.email}) for front-desk printing; track each batch Not Sent → Sent → Paid / Denied.
        </p>

        {!cases && <p className="status">{status || "Loading cases…"}</p>}
        {cases && cases.length === 0 && <p className="status warn">No documented visits yet.</p>}

        {cases && cases.length > 0 && (
          <>
            <h3 className="exam-h">1 — Select the case</h3>
            <table className="rom-table">
              <thead>
                <tr><th></th><th>Patient</th><th>DOA</th><th>Carrier</th><th>EMC</th><th>Visits</th></tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr
                    key={c.key}
                    style={selected?.key === c.key ? { background: "rgba(22,160,133,.18)" } : undefined}
                    onClick={() => {
                      setSelected(c);
                      setAudit(null);
                    }}
                  >
                    <td><input type="radio" checked={selected?.key === c.key} onChange={() => setSelected(c)} /></td>
                    <td>{c.name}</td>
                    <td>{c.accidentDate || "—"}</td>
                    <td>{c.carrier || "—"}</td>
                    <td>{c.emc}</td>
                    <td>{c.visitCounts.initial + c.visitCounts.followup + c.visitCounts.final} MD · {c.visitCounts.pt} PT</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {selected && (
          <>
            <h3 className="exam-h">2 — Batches (8 visits per claim package)</h3>
            {!claimsAddressFor(selected) && (
              <p className="status warn">
                ⛔ No claims mailing address for {selected.carrier || "this carrier"} — add it in Catalogs → Insurance
                Carriers. Mailing is the only accepted submission path.
              </p>
            )}
            {batches.map((b) => {
              const pkg = packageFor(selected, b.index);
              return (
                <div key={b.index} className="case-row" style={{ border: "1px solid var(--line)", borderRadius: 8, marginBottom: 8 }}>
                  <span className="case-doa">Batch {b.index}</span>
                  <span className="status">
                    {b.visits.length} visit{b.visits.length > 1 ? "s" : ""} · {b.firstDos} → {b.lastDos}
                  </span>
                  {pkg ? (
                    <span className={`badge-status pkg-${pkg.status}`}>{PACKAGE_STATUS_LABELS[pkg.status as PackageStatus] ?? pkg.status}</span>
                  ) : (
                    <span className="badge-status st-intake">Not Built</span>
                  )}
                  <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn ghost" disabled={busy} onClick={() => runAudit(b)}>
                      Audit
                    </button>
                    <button className="btn gold" disabled={busy} onClick={() => buildAndPrint(b)}>
                      {pkg ? "Rebuild & Print" : "Audit & Build Package"}
                    </button>
                    {pkg && (
                      <>
                        <button className="btn ghost" disabled={busy} onClick={() => reprint(b)}>
                          Reprint
                        </button>
                        <button className="btn ghost" disabled={busy} onClick={() => download(b)}>
                          Download
                        </button>
                        <button className="btn ghost" disabled={busy} onClick={() => emailToClinic(b)}>
                          Email to clinic
                        </button>
                        {pkg.status === "not_sent" && (
                          <button className="btn" onClick={() => setPkgStatus(pkg, "sent")}>
                            Mark Sent (mailed)
                          </button>
                        )}
                        {pkg.status === "sent" && (
                          <>
                            <button className="btn" onClick={() => setPkgStatus(pkg, "paid")}>
                              Mark Paid
                            </button>
                            <button className="btn ghost" onClick={() => setPkgStatus(pkg, "denied")}>
                              Mark Denied
                            </button>
                          </>
                        )}
                        {pkg.status === "denied" && (
                          <button className="btn ghost" onClick={() => setPkgStatus(pkg, "sent")}>
                            Re-sent
                          </button>
                        )}
                      </>
                    )}
                  </span>
                </div>
              );
            })}

            {audit && (
              <div className="section" style={{ borderColor: audit.result.stops.length ? "var(--warning)" : "var(--success)" }}>
                <div className="section-head">
                  <span className="section-title">
                    Pre-submission audit — batch {audit.batch}
                    {audit.result.totalBilled && ` · total $${audit.result.totalBilled}`}
                  </span>
                </div>
                <div className="section-body">
                  {audit.result.stops.length === 0 && audit.result.warnings.length === 0 && (
                    <p className="status ok">✓ Clean — ready to build, print, and mail.</p>
                  )}
                  <ul className="dx-list">
                    {audit.result.stops.map((s) => (
                      <li key={s} className="status warn">⛔ {s}</li>
                    ))}
                    {audit.result.warnings.map((w) => (
                      <li key={w} className="status">⚠️ {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
        <p className="status" style={{ marginTop: 10 }}>{status}</p>
      </div>
    </div>
  );
}
