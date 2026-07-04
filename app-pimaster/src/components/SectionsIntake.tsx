import { useEffect, useState } from "react";
import type { VisitForm } from "../lib/types";
import { draftHpi } from "../lib/ai";
import { injuryNarrative } from "../lib/narratives";
import { listCarriers, type CarrierRow } from "../lib/store";
import { Area, Section, Select, Text, YesNoField } from "./fields";
import { PhraseBar } from "./PhraseBar";

export interface SectionProps {
  form: VisitForm;
  patch: <S extends keyof VisitForm>(section: S, partial: Partial<VisitForm[S]>) => void;
  readOnly?: boolean;
}

export function Section1CheckIn({ form, patch }: SectionProps) {
  const p = form.patient;
  const [carriers, setCarriers] = useState<CarrierRow[]>([]);
  const [customCarrier, setCustomCarrier] = useState(false);
  useEffect(() => {
    listCarriers()
      .then((rows) => setCarriers(rows.filter((c) => c.active)))
      .catch(() => setCarriers([]));
  }, []);

  const listed = carriers.find((c) => c.name === p.insuranceCarrier);
  const showCustom = carriers.length === 0 || customCarrier || (!listed && p.insuranceCarrier.trim() !== "");

  // Picking a carrier silently snapshots its claims routing (address/payer id)
  // onto the visit for the CMS-1500 — the routing itself is managed by the
  // admin in Catalogs → Insurance Carriers, not shown at intake.
  function chooseCarrier(v: string) {
    if (v === "__other") {
      setCustomCarrier(true);
      patch("patient", { insuranceCarrier: "", insurerAddress: "", insurerPhone: "", insurerPayerId: "" });
      return;
    }
    setCustomCarrier(false);
    const c = carriers.find((x) => x.name === v);
    patch("patient", {
      insuranceCarrier: v,
      insurerAddress: c?.claims_address ?? "",
      insurerPhone: c?.claims_phone ?? "",
      insurerPayerId: c?.payer_id ?? "",
    });
  }

  return (
    <Section num={1} title="Staff Check-In" tag="All visit types">
      <div className="grid">
        <Text label="Patient First Name" value={p.firstName} onChange={(v) => patch("patient", { firstName: v })} />
        <Text label="Patient Last Name" value={p.lastName} onChange={(v) => patch("patient", { lastName: v })} />
        <Text label="Date of Birth" type="date" value={p.dob} onChange={(v) => patch("patient", { dob: v })} />
        <Select
          label="Sex"
          value={p.sex}
          onChange={(v) => patch("patient", { sex: v as VisitForm["patient"]["sex"] })}
          options={["male", "female", "other"]}
          labels={["Male", "Female", "Other"]}
        />
        {carriers.length > 0 && (
          <div className="field">
            <label>Insurance Carrier (auto/PIP)</label>
            <select value={listed ? p.insuranceCarrier : showCustom ? "__other" : ""} onChange={(e) => chooseCarrier(e.target.value)}>
              <option value="">— select carrier —</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="__other">Other — not in the list</option>
            </select>
          </div>
        )}
        {showCustom && (
          <Text label="Carrier name (not in list)" value={p.insuranceCarrier} onChange={(v) => patch("patient", { insuranceCarrier: v })} />
        )}
        <Text label="Policy Number" value={p.policyNumber} onChange={(v) => patch("patient", { policyNumber: v })} />
        <Text label="Claim Number" value={p.claimNumber ?? ""} onChange={(v) => patch("patient", { claimNumber: v })} />
        <Text label="Address" value={p.address} onChange={(v) => patch("patient", { address: v })} />
        <Text label="City" value={p.city} onChange={(v) => patch("patient", { city: v })} />
        <Text label="State" value={p.state} onChange={(v) => patch("patient", { state: v })} />
        <Text label="ZIP" value={p.zip} onChange={(v) => patch("patient", { zip: v })} />
        <Text label="Phone" value={p.phone} onChange={(v) => patch("patient", { phone: v })} />
      </div>
      {listed?.claims_phone && (
        <p className="status" style={{ marginTop: 8 }}>
          Carrier claims phone: {listed.claims_phone}
        </p>
      )}
    </Section>
  );
}

/** Shown only on telehealth visits — consent must be captured before the note can be generated. */
export function TelehealthConsent({ form, patch }: SectionProps) {
  const t = form.telehealth;
  return (
    <Section num={0} title="Telehealth Encounter — Consent & Origination" tag="Required before documentation">
      <p className="status">
        Facility-originated telehealth: the patient is physically present at the clinic (originating site, Florida);
        the provider conducts the evaluation from a distant site. This statement is inserted into the note automatically.
      </p>
      <div className="grid">
        <div className="field">
          <label>Patient consent to telehealth evaluation</label>
          <div className="yn">
            <button
              type="button"
              className={t.consentObtained ? "on-yes" : ""}
              onClick={() => patch("telehealth", { consentObtained: !t.consentObtained })}
            >
              {t.consentObtained ? "✓ Consent obtained & documented" : "Mark consent obtained"}
            </button>
          </div>
        </div>
        <Text label="Consent obtained by (staff name)" value={t.consentBy} onChange={(v) => patch("telehealth", { consentBy: v })} />
        {(form.visitType === "initial" || form.visitType === "final") && (
          <Text
            label="Reason for telehealth on an initial/final visit (required — these default to in-person)"
            value={t.overrideReason}
            onChange={(v) => patch("telehealth", { overrideReason: v })}
            wide
          />
        )}
      </div>
    </Section>
  );
}

export function Section2Injury({ form, patch, readOnly, showNarrative }: SectionProps & { showNarrative?: boolean }) {
  const a = form.accident;
  const [busy, setBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  // HPI preview is physician-facing: staff enter the facts; the composed
  // narrative appears only in the physician view and on the signed note.
  const narrative = showNarrative ? injuryNarrative(form.patient, a, { visitDate: form.visitDate, visitType: form.visitType }) : "";
  const hpiDraft = form.ai?.hpiDraft ?? "";

  async function runDraft() {
    setBusy(true);
    setAiStatus("Drafting HPI…");
    const res = await draftHpi(form);
    setBusy(false);
    if (res.ok && res.narrative) {
      patch("ai", { hpiDraft: res.narrative });
      setAiStatus("Draft ready — review and edit below before generating the note.");
    } else {
      setAiStatus(`Draft failed: ${res.error}`);
    }
  }

  return (
    <Section num={2} title="Injury Details" tag="All visit types" readOnly={readOnly}>
      <div className="grid">
        <Text label="Accident Date" type="date" value={a.accidentDate} onChange={(v) => patch("accident", { accidentDate: v })} />
        <Select
          label="Accident Type"
          value={a.accidentType}
          onChange={(v) => patch("accident", { accidentType: v as VisitForm["accident"]["accidentType"] })}
          options={["MVA", "Work", "Fall", "Sports", "Other"]}
        />
        <YesNoField label="Ticketed" value={a.ticketed} onChange={(v) => patch("accident", { ticketed: v })} />
        <Select
          label="Role"
          value={a.role}
          onChange={(v) => patch("accident", { role: v as VisitForm["accident"]["role"] })}
          options={["Driver", "Front Passenger", "Rear Passenger", "Pedestrian", "Other"]}
        />
        <YesNoField label="Seatbelt" value={a.seatbelt} onChange={(v) => patch("accident", { seatbelt: v })} />
        <YesNoField label="Airbag" value={a.airbag} onChange={(v) => patch("accident", { airbag: v })} />
        <YesNoField label="Vehicle Drivable" value={a.vehicleDrivable} onChange={(v) => patch("accident", { vehicleDrivable: v })} />
        <YesNoField label="Prior Medical Professional" value={a.priorMedical} onChange={(v) => patch("accident", { priorMedical: v })} />
      </div>

      {showNarrative && (
        <div style={{ marginTop: 12 }}>
          {!hpiDraft && narrative && <div className="narr">{narrative}</div>}
          <PhraseBar category="hpi" value={form.ai?.hpiNotes ?? ""} onInsert={(v) => patch("ai", { hpiNotes: v })} />
          <div className="grid" style={{ marginTop: 10 }}>
            <Area
              label="Physician HPI notes — brief bullets (onset, symptoms, radiation, severity, timeline)"
              value={form.ai?.hpiNotes ?? ""}
              onChange={(v) => patch("ai", { hpiNotes: v })}
            />
          </div>
          <div className="toolbar" style={{ margin: "8px 0 0" }}>
            <button className="btn gold" disabled={busy} onClick={runDraft}>
              {busy ? "Drafting…" : hpiDraft ? "Re-draft HPI with AI" : "Draft HPI with AI"}
            </button>
            {hpiDraft && (
              <button className="btn ghost" onClick={() => patch("ai", { hpiDraft: "" })}>
                Discard draft (use auto narrative)
              </button>
            )}
            <span className="status">{aiStatus}</span>
          </div>
          {hpiDraft && (
            <div className="grid" style={{ marginTop: 8 }}>
              <Area
                label="AI-drafted HPI — YOUR reviewed text prints on the note (edit freely)"
                value={hpiDraft}
                onChange={(v) => patch("ai", { hpiDraft: v })}
              />
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
