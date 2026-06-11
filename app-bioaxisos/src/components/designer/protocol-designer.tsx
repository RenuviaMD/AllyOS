"use client";

import { useMemo, useState, useTransition } from "react";
import { createPrescription } from "@/app/actions/prescriptions";
import type { CatalogItem } from "@/lib/formulary/catalog";
import { filterFormulary } from "@/lib/formulary/filter";
import { axisEnum, statusEnum } from "@/lib/formulary/schema";
import type { FormularyFilter } from "@/lib/schemas";

const AXES = axisEnum.options;
const STATUSES = statusEnum.options;

const STATUS_LABEL: Record<string, string> = {
  fda_approved: "FDA-approved",
  off_label: "Off-label",
  investigational: "Investigational",
  not_approved: "Not approved",
};

const COMPLIANCE_ITEMS = [
  { key: "consentSigned", label: "Off-label/investigational consent signed" },
  { key: "patientEducationDelivered", label: "Patient education delivered" },
  { key: "sourcePharmacyVerified", label: "Source pharmacy verified" },
  { key: "classGatingItemConfirmed", label: "Class-specific gating item confirmed" },
] as const;

type ComplianceKey = (typeof COMPLIANCE_ITEMS)[number]["key"];

interface PatientOption {
  id: string;
  mrn: string;
}

/**
 * Protocol Designer (spec §4.5) — filter rail / formulary grid / popup card with
 * the "Prescribe to Patient" compliance gate. Prescribing commits through the
 * audited createPrescription server action (RBAC + row-level ownership).
 */
export function ProtocolDesigner({
  catalog,
  patients,
}: {
  catalog: CatalogItem[];
  patients: PatientOption[];
}) {
  const [query, setQuery] = useState("");
  const [axes, setAxes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [patientId, setPatientId] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("SC");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [gate, setGate] = useState<Record<ComplianceKey, boolean>>({
    consentSigned: false,
    patientEducationDelivered: false,
    sourcePharmacyVerified: false,
    classGatingItemConfirmed: false,
  });

  const results = useMemo(() => {
    const filter: FormularyFilter = {
      kind: "all",
      query: query || undefined,
      axes: axes.length ? (axes as FormularyFilter["axes"]) : undefined,
      statuses: statuses.length ? (statuses as FormularyFilter["statuses"]) : undefined,
    };
    return filterFormulary(catalog, filter);
  }, [catalog, query, axes, statuses]);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function select(item: CatalogItem) {
    setSelected(item);
    setResult(null);
    setDose("");
    setGate({
      consentSigned: false,
      patientEducationDelivered: false,
      sourcePharmacyVerified: false,
      classGatingItemConfirmed: false,
    });
  }

  const gateComplete = COMPLIANCE_ITEMS.every((i) => gate[i.key]);
  const canPrescribe = gateComplete && patientId !== "" && dose.trim() !== "" && !pending;

  function prescribe() {
    if (!selected || !canPrescribe) return;
    setResult(null);
    startTransition(async () => {
      const res = await createPrescription({
        patientId,
        items: [{ slug: selected.slug, kind: selected.kind, dose: dose.trim(), route: route.trim() }],
        complianceConfirmed: {
          consentSigned: true,
          patientEducationDelivered: true,
          sourcePharmacyVerified: true,
          classGatingItemConfirmed: true,
        },
      });
      setResult(
        res.ok
          ? { ok: true, message: "Prescribed. Now active on the patient's chart." }
          : { ok: false, message: res.error ?? "Could not prescribe." },
      );
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_340px]">
      {/* Column 1 — filter rail */}
      <aside className="card h-fit p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search formulary…"
          className="mb-4 w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <FilterGroup title="Axis" options={AXES} selected={axes} onToggle={(v) => toggle(axes, setAxes, v)} />
        <FilterGroup
          title="Status"
          options={STATUSES}
          labels={STATUS_LABEL}
          selected={statuses}
          onToggle={(v) => toggle(statuses, setStatuses, v)}
        />
      </aside>

      {/* Column 2 — formulary grid */}
      <section>
        <p className="mb-3 text-sm text-ink-muted">{results.length} cards</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((item) => (
            <button
              key={item.slug}
              onClick={() => select(item)}
              className={`card p-4 text-left transition-colors hover:border-accent ${
                selected?.slug === item.slug ? "border-accent" : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-sans text-sm font-semibold">{item.name}</span>
                <span className="rounded bg-surface-base px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
                  {item.axis}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-ink-muted">{item.popup_summary.mechanism}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Column 3 — popup card + compliance gate */}
      <aside className="card h-fit p-5">
        {!selected ? (
          <p className="text-sm text-ink-muted">Select a formulary card to review and prescribe.</p>
        ) : (
          <div>
            <h3 className="font-sans text-base font-semibold">{selected.name}</h3>
            <p className="mb-3 text-xs text-ink-faint">
              {STATUS_LABEL[selected.status]} · {selected.axis}
            </p>
            <Field label="Mechanism" value={selected.popup_summary.mechanism} />
            <Field label="Primary use" value={selected.popup_summary.primary_use} />
            <Field label="Contraindications" value={selected.popup_summary.contraindications_short} />
            <Field label="Clinical note" value={selected.popup_summary.clinical_notes_short} />

            <div className="my-4 border-t border-surface-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Patient & dose
              </p>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="mb-2 w-full rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-xs outline-none focus:border-accent"
              >
                <option value="">
                  {patients.length ? "Select patient…" : "No patients (seed/connect DB)"}
                </option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    MRN {p.mrn}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  placeholder="Dose (e.g. 250 mcg daily)"
                  className="w-full rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-xs outline-none focus:border-accent"
                />
                <input
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="Route"
                  className="w-20 rounded-md border border-surface-border bg-surface-base px-2 py-1.5 text-xs outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="my-4 border-t border-surface-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Compliance gate
              </p>
              {COMPLIANCE_ITEMS.map((item) => (
                <label key={item.key} className="mb-2 flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={gate[item.key]}
                    onChange={(e) => setGate((g) => ({ ...g, [item.key]: e.target.checked }))}
                    className="mt-0.5 accent-[#22D3EE]"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <button
              disabled={!canPrescribe}
              onClick={prescribe}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Prescribing…" : "Prescribe to Patient"}
            </button>
            {!gateComplete && (
              <p className="mt-2 text-[11px] text-ink-faint">
                Confirm all four gate items, pick a patient, and enter a dose to enable.
              </p>
            )}
            {result && (
              <p
                className={`mt-3 rounded-md p-2 text-xs ${
                  result.ok
                    ? "border border-status-ok/40 bg-status-ok/10 text-status-ok"
                    : "border border-status-stop/40 bg-status-stop/10 text-status-stop"
                }`}
              >
                {result.message}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function FilterGroup({
  title,
  options,
  labels,
  selected,
  onToggle,
}: {
  title: string;
  options: readonly string[];
  labels?: Record<string, string>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="accent-[#22D3EE]"
            />
            <span>{labels?.[opt] ?? opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="text-xs text-ink">{value}</p>
    </div>
  );
}
