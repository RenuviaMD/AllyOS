"use client";

import { useMemo, useState } from "react";
import type { CatalogItem } from "@/lib/formulary/catalog";
import { filterFormulary } from "@/lib/formulary/filter";
import { axisEnum, statusEnum } from "@/lib/formulary/schema";

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

/**
 * Protocol Designer (spec §4.5) — 3 columns: filter rail / formulary grid /
 * popup card with the "Prescribe to Patient" compliance gate. Operational
 * styling: flat surfaces, no glow.
 */
export function ProtocolDesigner({ catalog }: { catalog: CatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [axes, setAxes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [gate, setGate] = useState<Record<ComplianceKey, boolean>>({
    consentSigned: false,
    patientEducationDelivered: false,
    sourcePharmacyVerified: false,
    classGatingItemConfirmed: false,
  });
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const results = useMemo(
    () =>
      filterFormulary(catalog, {
        kind: "all",
        query: query || undefined,
        axes: axes.length ? (axes as typeof AXES) : undefined,
        statuses: statuses.length ? (statuses as typeof STATUSES) : undefined,
      }),
    [catalog, query, axes, statuses],
  );

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function select(item: CatalogItem) {
    setSelected(item);
    setConfirmed(null);
    setGate({
      consentSigned: false,
      patientEducationDelivered: false,
      sourcePharmacyVerified: false,
      classGatingItemConfirmed: false,
    });
  }

  const gateComplete = COMPLIANCE_ITEMS.every((i) => gate[i.key]);

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
              disabled={!gateComplete}
              onClick={() => setConfirmed(selected.slug)}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prescribe to Patient
            </button>
            {!gateComplete && (
              <p className="mt-2 text-[11px] text-ink-faint">
                All four gate items must be confirmed to enable prescribing.
              </p>
            )}
            {confirmed === selected.slug && (
              <p className="mt-3 rounded-md border border-status-ok/40 bg-status-ok/10 p-2 text-xs text-status-ok">
                Gate satisfied. Next: select a patient chart to commit this protocol (server action
                <code className="mono"> createPrescription</code> is wired and audited).
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
