import { useEffect, useState } from "react";
import { buildFacilityReportHtml, complianceFlags, expiryStatus, REGISTRIES, type FacilityRow } from "../lib/facility";
import { printHtml } from "../lib/report";
import { listFacilityRows, loadAhcaLicense, saveAhcaLicense, upsertFacilityRow } from "../lib/store";
import { CLINIC } from "../lib/clinic";

export function FacilityPanel(props: { onClose: () => void }) {
  const [tab, setTab] = useState(REGISTRIES[0].table);
  const [data, setData] = useState<Record<string, FacilityRow[]>>({});
  const [draft, setDraft] = useState<FacilityRow>({});
  const [status, setStatus] = useState("");
  const [license, setLicense] = useState({ ahca_license_number: "", ahca_license_expiration: "" });

  function refresh() {
    Promise.all(REGISTRIES.map((r) => listFacilityRows(r.table).catch(() => [])))
      .then((all) => setData(Object.fromEntries(REGISTRIES.map((r, i) => [r.table, all[i]]))))
      .catch(() => {});
    loadAhcaLicense().then(setLicense).catch(() => {});
  }
  useEffect(refresh, []);

  const reg = REGISTRIES.find((r) => r.table === tab)!;
  const rows = data[tab] ?? [];
  const flags = complianceFlags(data);

  async function addRow() {
    if (!draft[reg.nameKey]) {
      setStatus(`"${reg.fields[0].label}" is required.`);
      return;
    }
    const res = await upsertFacilityRow(reg.table, draft);
    setStatus(res.ok ? "Saved." : `Save failed: ${res.error}`);
    if (res.ok) {
      setDraft({});
      refresh();
    }
  }

  async function saveRowField(row: FacilityRow, key: string, value: unknown) {
    await upsertFacilityRow(reg.table, { ...row, [key]: value });
    refresh();
  }

  async function saveLicense(partial: Partial<typeof license>) {
    const next = { ...license, ...partial };
    setLicense(next);
    await saveAhcaLicense(next).catch(() => {});
  }

  function printReport() {
    printHtml(
      buildFacilityReportHtml({
        data,
        reviewer: CLINIC.provider,
        ahcaLicense: license.ahca_license_number,
        ahcaLicenseExpiration: license.ahca_license_expiration,
      }),
    );
  }

  const inputStyle = {
    background: "var(--hover)",
    border: "1px solid #46627f",
    color: "var(--text)",
    borderRadius: 4,
    padding: "4px 6px",
    width: "100%",
  } as const;

  function editor(row: FacilityRow, fieldKey: string, type: "text" | "date" | "bool", onChange: (v: unknown) => void) {
    const v = row[fieldKey];
    if (type === "bool") {
      return (
        <button
          type="button"
          className={`btn ghost`}
          style={{ padding: "2px 10px", color: v === true ? "var(--success)" : "var(--warning)" }}
          onClick={() => onChange(v !== true)}
        >
          {v === true ? "Yes" : "No"}
        </button>
      );
    }
    return (
      <input
        type={type}
        defaultValue={(v as string) ?? ""}
        onBlur={(e) => {
          if (e.target.value !== ((v as string) ?? "")) onChange(e.target.value);
        }}
        style={inputStyle}
      />
    );
  }

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" style={{ width: "min(1100px, 97vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Facility Compliance — AHCA Registry</h2>
          <button className="btn gold" onClick={printReport}>Print Binder Report</button>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>

        <div className="grid" style={{ marginBottom: 8 }}>
          <div className="field">
            <label>AHCA Health Care Clinic License #</label>
            <input value={license.ahca_license_number} onChange={(e) => saveLicense({ ahca_license_number: e.target.value })} />
          </div>
          <div className="field">
            <label>AHCA License Expiration</label>
            <input type="date" value={license.ahca_license_expiration} onChange={(e) => saveLicense({ ahca_license_expiration: e.target.value })} />
          </div>
        </div>

        {flags.length > 0 && (
          <div className="section" style={{ borderColor: "var(--warning)", marginBottom: 10 }}>
            <div className="section-body">
              <strong className="status warn">Open items ({flags.length}):</strong>
              <ul className="dx-list">
                {flags.slice(0, 12).map((f) => (
                  <li key={f}>⚠️ {f}</li>
                ))}
                {flags.length > 12 && <li className="status">…and {flags.length - 12} more (all print on the report)</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="seg" style={{ marginBottom: 10 }}>
          {REGISTRIES.map((r) => (
            <button key={r.table} className={tab === r.table ? "active" : ""} onClick={() => { setTab(r.table); setDraft({}); }}>
              {r.label} ({(data[r.table] ?? []).length})
            </button>
          ))}
        </div>

        <table className="rom-table">
          <thead>
            <tr>
              {reg.fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id as string}>
                {reg.fields.map((f) => (
                  <td key={f.key}>{editor(row, f.key, f.type, (v) => saveRowField(row, f.key, v))}</td>
                ))}
                <td className="status">
                  {reg.fields.some((f) => f.type === "date" && f.key.match(/expir|due/)) &&
                    (() => {
                      const dateField = reg.fields.find((f) => f.type === "date" && f.key.match(/expir|due/))!;
                      const st = expiryStatus(row[dateField.key]);
                      return st === "OK" ? "✓" : st;
                    })()}
                </td>
              </tr>
            ))}
            <tr>
              {reg.fields.map((f) => (
                <td key={f.key}>
                  {f.type === "bool" ? (
                    <button type="button" className="btn ghost" style={{ padding: "2px 10px" }} onClick={() => setDraft({ ...draft, [f.key]: !(draft[f.key] === true) })}>
                      {draft[f.key] === true ? "Yes" : "No"}
                    </button>
                  ) : (
                    <input
                      type={f.type}
                      value={(draft[f.key] as string) ?? ""}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      placeholder={f.label}
                      style={inputStyle}
                    />
                  )}
                </td>
              ))}
              <td>
                <button className="btn" onClick={addRow}>Add</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="status">{status || "Edits save on blur. This registry stores no PHI — incidents are tracked by patient initials only."}</p>
      </div>
    </div>
  );
}
