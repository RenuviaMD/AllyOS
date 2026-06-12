import { useEffect, useState } from "react";
import { billableCpts, loadBillingSettings, saveBillingSettings, type BillingSettings } from "../lib/billing";
import { saveClinicBilling, syncBillingFromCloud, upsertServiceCatalog } from "../lib/store";
import { Section, Text } from "./fields";

export function BillingSettingsCard(props: { onClose: () => void }) {
  const [s, setS] = useState<BillingSettings>(loadBillingSettings);

  useEffect(() => {
    syncBillingFromCloud().then(() => setS(loadBillingSettings())).catch(() => {});
  }, []);

  function update(partial: Partial<BillingSettings>) {
    const next = { ...s, ...partial };
    setS(next);
    saveBillingSettings(next);
    saveClinicBilling({ ein: next.ein, billing_npi: next.billingNpi, rendering_npi: next.renderingNpi }).catch(() => {});
  }

  function setFee(cpt: string, charge: string) {
    const next = { ...s, fees: { ...s.fees, [cpt]: charge } };
    setS(next);
    saveBillingSettings(next);
    const item = billableCpts().find((c) => c.cpt === cpt);
    upsertServiceCatalog({
      cpt,
      name: item?.name ?? cpt,
      category: cpt.startsWith("99") ? "em" : "pt",
      default_units: 1,
      charge: charge || null,
      active: true,
    }).catch(() => {});
  }

  return (
    <div className="modal-back" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <Section num={0} title="Billing Settings" tag="Used by Superbill & CMS-1500">
          <p className="status">
            Synced to the clinic record (with a local cache for offline use). Charges left blank print blank — they are
            never estimated or invented.
          </p>
          <div className="grid">
            <Text label="Federal Tax ID (EIN) — Box 25" value={s.ein} onChange={(v) => update({ ein: v })} />
            <Text label="Billing NPI (group) — Box 33a" value={s.billingNpi} onChange={(v) => update({ billingNpi: v })} />
            <Text label="Rendering NPI — Box 24J" value={s.renderingNpi} onChange={(v) => update({ renderingNpi: v })} />
          </div>
          <h3 className="exam-h">Fee Schedule (per CPT)</h3>
          <table className="rom-table">
            <thead>
              <tr>
                <th>CPT</th>
                <th>Service</th>
                <th>Charge ($)</th>
              </tr>
            </thead>
            <tbody>
              {billableCpts().map((c) => (
                <tr key={c.cpt}>
                  <td>{c.cpt}</td>
                  <td>{c.name}</td>
                  <td>
                    <input
                      value={s.fees[c.cpt] ?? ""}
                      onChange={(e) => setFee(c.cpt, e.target.value)}
                      placeholder="—"
                      style={{
                        background: "var(--hover)",
                        border: "1px solid #46627f",
                        color: "var(--text)",
                        borderRadius: 4,
                        padding: "4px 8px",
                        width: 110,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar" style={{ margin: "14px 0 0" }}>
            <button className="btn" onClick={props.onClose}>
              Done
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
