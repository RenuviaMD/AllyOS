import { useState } from "react";
import { createClinic, emptyClinicInput, slugify, validateClinicInput, type NewClinicInput } from "../lib/onboarding";
import type { ImagingMode } from "../lib/imaging";
import { Text } from "./fields";

/** Platform-admin only: onboard a new clinic with settings + seeded catalogs. */
export function OnboardingWizard(props: { onClose: () => void; onCreated: (id: string) => void }) {
  const [c, setC] = useState<NewClinicInput>(emptyClinicInput);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function set(partial: Partial<NewClinicInput>) {
    setC({ ...c, ...partial });
  }

  async function submit() {
    const errs = validateClinicInput(c);
    setProblems(errs);
    if (errs.length > 0) return;
    setBusy(true);
    setStatus("Creating clinic, settings, and catalogs…");
    const res = await createClinic(c);
    setBusy(false);
    if (!res.ok) {
      setStatus(`Failed: ${res.error}`);
      return;
    }
    setStatus(`Clinic "${c.name}" created (${res.id}).`);
    props.onCreated(res.id!);
  }

  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(820px, 96vw)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>New Clinic Onboarding</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>
        <p className="status">
          Creates the clinic with its own letterhead, billing identity, imaging setup, and a seeded ICD-10/CPT catalog
          (the verified default template). Staff then create their own logins on the sign-in screen and you assign them
          to this clinic in Users.
        </p>

        <h3 className="exam-h">1 — Clinic identity (prints on every document)</h3>
        <div className="grid">
          <Text label="Clinic legal name — REQUIRED" value={c.name} onChange={(v) => set({ name: v })} />
          <div className="field">
            <label>Clinic ID (auto)</label>
            <input value={slugify(c.name)} readOnly />
          </div>
          <Text label="Address — REQUIRED" value={c.address} onChange={(v) => set({ address: v })} wide />
          <Text label="Phone" value={c.phone} onChange={(v) => set({ phone: v })} />
          <Text label="Fax" value={c.fax} onChange={(v) => set({ fax: v })} />
          <Text label="Email" value={c.email} onChange={(v) => set({ email: v })} />
        </div>

        <h3 className="exam-h">2 — Rendering provider (signs notes, CMS-1500 Box 24J)</h3>
        <div className="grid">
          <Text label="Provider name — REQUIRED" value={c.providerName} onChange={(v) => set({ providerName: v })} />
          <Text label="License (e.g. FL ME 12345)" value={c.providerLicense} onChange={(v) => set({ providerLicense: v })} />
          <Text label="Provider NPI — REQUIRED" value={c.providerNpi} onChange={(v) => set({ providerNpi: v })} />
        </div>

        <h3 className="exam-h">3 — Billing identity (Boxes 25 / 33a — can be completed later)</h3>
        <div className="grid">
          <Text label="Federal Tax ID (EIN)" value={c.ein} onChange={(v) => set({ ein: v })} />
          <Text label="Billing NPI (group)" value={c.billingNpi} onChange={(v) => set({ billingNpi: v })} />
        </div>

        <h3 className="exam-h">4 — Imaging / diagnostics</h3>
        <div className="seg" style={{ marginBottom: 10 }}>
          {(["third_party", "onsite"] as ImagingMode[]).map((m) => (
            <button key={m} className={c.imagingMode === m ? "active" : ""} onClick={() => set({ imagingMode: m })}>
              {m === "third_party" ? "Third-party center" : "On-site imaging"}
            </button>
          ))}
        </div>
        {c.imagingMode === "third_party" && (
          <div className="grid">
            <Text label="Diagnostic center name — REQUIRED" value={c.dxCenterName} onChange={(v) => set({ dxCenterName: v })} />
            <Text label="Center address" value={c.dxCenterAddress} onChange={(v) => set({ dxCenterAddress: v })} />
            <Text label="Center phone" value={c.dxCenterPhone} onChange={(v) => set({ dxCenterPhone: v })} />
            <Text label="Center fax" value={c.dxCenterFax} onChange={(v) => set({ dxCenterFax: v })} />
          </div>
        )}

        {problems.length > 0 && (
          <ul className="dx-list" style={{ marginTop: 10 }}>
            {problems.map((p) => (
              <li key={p} className="status warn">⛔ {p}</li>
            ))}
          </ul>
        )}

        <div className="toolbar" style={{ margin: "14px 0 0" }}>
          <button className="btn gold" disabled={busy} onClick={submit}>
            {busy ? "Creating…" : "Create Clinic"}
          </button>
          <span className="status">{status}</span>
        </div>
      </div>
    </div>
  );
}
