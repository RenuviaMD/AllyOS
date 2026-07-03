import { useEffect, useState } from "react";
import {
  listDxCatalog,
  listServiceCatalog,
  upsertDxCatalog,
  upsertServiceCatalog,
  type DxCatalogRow,
  type ServiceCatalogRow,
} from "../lib/store";

/** Loose structural check; authoritative validation against the official CMS
 * code set runs server-side in the SaaS backend. Rejects obvious non-codes
 * and non-billable category headers (a billable ICD-10-CM code is ≥4 chars). */
export function looksLikeIcd10(code: string): boolean {
  return /^[A-TV-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/.test(code) && code.replace(".", "").length >= 4;
}

export function looksLikeCpt(code: string): boolean {
  return /^[0-9]{4}[0-9A-Z]$/.test(code);
}

export function CatalogPage(props: { onClose: () => void }) {
  const [tab, setTab] = useState<"dx" | "cpt">("dx");
  const [dx, setDx] = useState<DxCatalogRow[]>([]);
  const [services, setServices] = useState<ServiceCatalogRow[]>([]);
  const [status, setStatus] = useState("");
  const [newDx, setNewDx] = useState({ code: "", description: "", region: "", kind: "other" });
  const [newCpt, setNewCpt] = useState({ cpt: "", name: "", category: "other", charge: "" });

  function refresh() {
    listDxCatalog().then(setDx).catch((e) => setStatus(`Load failed: ${e.message}`));
    listServiceCatalog().then(setServices).catch((e) => setStatus(`Load failed: ${e.message}`));
  }
  useEffect(refresh, []);

  async function addDx() {
    const code = newDx.code.trim().toUpperCase();
    if (!looksLikeIcd10(code)) {
      setStatus(`"${code}" is not a valid billable ICD-10-CM code format (category headers are not billable).`);
      return;
    }
    if (!newDx.description.trim()) {
      setStatus("Description is required.");
      return;
    }
    const res = await upsertDxCatalog({
      code,
      description: newDx.description.trim(),
      region: newDx.region || null,
      kind: newDx.kind,
      auto_derive: false,
      active: true,
    });
    setStatus(res.ok ? `${code} added to the clinic catalog.` : `Save failed: ${res.error}`);
    if (res.ok) {
      setNewDx({ code: "", description: "", region: "", kind: "other" });
      refresh();
    }
  }

  async function addCpt() {
    const cpt = newCpt.cpt.trim().toUpperCase();
    if (!looksLikeCpt(cpt)) {
      setStatus(`"${cpt}" is not a valid CPT/HCPCS format (5 characters).`);
      return;
    }
    if (!newCpt.name.trim()) {
      setStatus("Service name is required.");
      return;
    }
    const res = await upsertServiceCatalog({
      cpt,
      name: newCpt.name.trim(),
      category: newCpt.category,
      default_units: 1,
      charge: newCpt.charge || null,
      active: true,
    });
    setStatus(res.ok ? `${cpt} added to the clinic services.` : `Save failed: ${res.error}`);
    if (res.ok) {
      setNewCpt({ cpt: "", name: "", category: "other", charge: "" });
      refresh();
    }
  }

  async function toggleDxActive(row: DxCatalogRow) {
    await upsertDxCatalog({ ...row, active: !row.active });
    refresh();
  }
  async function toggleCptActive(row: ServiceCatalogRow) {
    await upsertServiceCatalog({ ...row, active: !row.active });
    refresh();
  }

  const input = (v: string, set: (s: string) => void, placeholder: string, width = 140) => (
    <input
      value={v}
      onChange={(e) => set(e.target.value)}
      placeholder={placeholder}
      style={{ background: "var(--hover)", border: "1px solid #46627f", color: "var(--text)", borderRadius: 4, padding: "5px 8px", width }}
    />
  );

  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(860px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Clinic Catalogs</h2>
          <div className="seg">
            <button className={tab === "dx" ? "active" : ""} onClick={() => setTab("dx")}>
              ICD-10 Diagnoses
            </button>
            <button className={tab === "cpt" ? "active" : ""} onClick={() => setTab("cpt")}>
              CPT Services
            </button>
          </div>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>
            Close
          </button>
        </div>
        <p className="status">{status || "Changes apply to this clinic's pick-lists immediately. Codes are never invented — only what is added here can be selected."}</p>

        {tab === "dx" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {input(newDx.code, (v) => setNewDx({ ...newDx, code: v }), "Code e.g. M54.12", 130)}
              {input(newDx.description, (v) => setNewDx({ ...newDx, description: v }), "Official description", 280)}
              <select value={newDx.region} onChange={(e) => setNewDx({ ...newDx, region: e.target.value })} style={{ background: "var(--hover)", color: "var(--text)", border: "1px solid #46627f", borderRadius: 4 }}>
                <option value="">region…</option>
                {["cervical", "thoracic", "lumbar", "shoulder", "elbow", "wrist", "hip", "knee", "ankle"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button className="btn" onClick={addDx}>Add code</button>
            </div>
            <table className="rom-table">
              <thead><tr><th>Code</th><th>Description</th><th>Region</th><th>Kind</th><th>Auto</th><th>Active</th></tr></thead>
              <tbody>
                {dx.map((r) => (
                  <tr key={r.id} style={{ opacity: r.active ? 1 : 0.45 }}>
                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>{r.code}</td>
                    <td>{r.description}</td>
                    <td>{r.region}</td>
                    <td>{r.kind}</td>
                    <td>{r.auto_derive ? "auto" : "pick"}</td>
                    <td><button className="btn ghost" onClick={() => toggleDxActive(r)}>{r.active ? "Deactivate" : "Activate"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === "cpt" && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {input(newCpt.cpt, (v) => setNewCpt({ ...newCpt, cpt: v }), "CPT e.g. 97124", 110)}
              {input(newCpt.name, (v) => setNewCpt({ ...newCpt, name: v }), "Service name", 240)}
              <select value={newCpt.category} onChange={(e) => setNewCpt({ ...newCpt, category: e.target.value })} style={{ background: "var(--hover)", color: "var(--text)", border: "1px solid #46627f", borderRadius: 4 }}>
                {["em", "pt", "imaging", "other"].map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              {input(newCpt.charge, (v) => setNewCpt({ ...newCpt, charge: v }), "Charge $ (optional)", 130)}
              <button className="btn" onClick={addCpt}>Add service</button>
            </div>
            <table className="rom-table">
              <thead><tr><th>CPT</th><th>Service</th><th>Category</th><th>Charge</th><th>Active</th></tr></thead>
              <tbody>
                {services.map((r) => (
                  <tr key={r.id} style={{ opacity: r.active ? 1 : 0.45 }}>
                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>{r.cpt}</td>
                    <td>{r.name}</td>
                    <td>{r.category}</td>
                    <td>{r.charge ? `$${r.charge}` : "—"}</td>
                    <td><button className="btn ghost" onClick={() => toggleCptActive(r)}>{r.active ? "Deactivate" : "Activate"}</button></td>
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
