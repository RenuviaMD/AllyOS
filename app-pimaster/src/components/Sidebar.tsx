import { useEffect, useRef, useState } from "react";
import { buildPatientIndex, SEARCH_MIN, searchPatients, type PatientIndexEntry } from "../lib/patients";
import { CLINIC } from "../lib/clinic";
import { listReportMeta } from "../lib/store";
import type { Role } from "../lib/types";

/**
 * Global sidebar (UX Blueprint U6, per the Design Bible's 230px sidebar):
 * brand block, patient search (3+ characters of last name, first name, or
 * phone digits; "/" focuses it from anywhere), clinic tag, role-filtered
 * navigation, and the user block with sign-out.
 */

export type NavAction =
  | { view: "today" | "encounter" | "patients" }
  | { modal: "package" | "archive" | "billing" | "billing_packages" | "export" | "attorney" | "catalogs" | "users" | "onboarding" };

interface NavItem {
  label: string;
  action: NavAction;
  show: boolean;
}

export function Sidebar(props: {
  role: Role;
  roleLabel: string;
  isAdmin: boolean;
  isPlatform: boolean;
  view: "today" | "encounter" | "patients";
  email: string;
  onNavigate: (a: NavAction) => void;
  onSelectPatient: (p: PatientIndexEntry) => void;
  onChangePassword: () => void;
  onSignOut: () => void;
}) {
  const { role } = props;
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<PatientIndexEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the patient search from anywhere (unless already typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The index loads lazily on first focus, from archived report metadata.
  function ensureIndex() {
    if (index !== null) return;
    listReportMeta()
      .then((rows) => setIndex(buildPatientIndex(rows)))
      .catch(() => setIndex([]));
  }

  const results = index && query.trim().length >= SEARCH_MIN ? searchPatients(index, query).slice(0, 8) : [];
  const showHint = open && query.trim().length > 0 && query.trim().length < SEARCH_MIN;

  function pick(p: PatientIndexEntry) {
    setOpen(false);
    setQuery("");
    props.onSelectPatient(p);
  }

  const nav: NavItem[] = [
    { label: "Today's Visits", action: { view: "today" }, show: true },
    { label: "Patients", action: { view: "patients" }, show: true },
    { label: "Open Encounter", action: { view: "encounter" }, show: true },
    { label: "Visit Documents", action: { modal: "package" }, show: true },
    { label: "Reports Archive", action: { modal: "archive" }, show: true },
    { label: "Billing Packages", action: { modal: "billing_packages" }, show: role === "physician" },
    { label: "Billing Settings", action: { modal: "billing" }, show: role !== "staff" },
    { label: "Encounter Export", action: { modal: "export" }, show: role === "physician" },
    { label: "Attorney Package", action: { modal: "attorney" }, show: role === "physician" },
    { label: "Catalogs", action: { modal: "catalogs" }, show: role === "physician" },
    { label: "Users", action: { modal: "users" }, show: props.isAdmin },
    { label: "New Clinic", action: { modal: "onboarding" }, show: props.isPlatform },
  ];

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="sb-by">by RenuviaMD®</span>
        <span className="sb-title">PI MASTER™</span>
        <span className="sb-sub">Clinical Documentation</span>
      </div>

      <div className="sb-search">
        <input
          ref={inputRef}
          value={query}
          placeholder="Patient search — press /"
          onFocus={() => {
            ensureIndex();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) pick(results[0]);
            if (e.key === "Escape") {
              setQuery("");
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {showHint && <div className="sb-hint">Type {SEARCH_MIN}+ letters or phone digits</div>}
        {open && query.trim().length >= SEARCH_MIN && (
          <div className="sb-results">
            {index === null && <div className="sb-hint">Loading patients…</div>}
            {index !== null && results.length === 0 && <div className="sb-hint">No matching patients</div>}
            {results.map((p) => (
              <button key={p.key} className="sb-result" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                <b>{p.name}</b>
                <span>
                  {p.dob && `DOB ${p.dob}`}
                  {p.carrier && ` · ${p.carrier}`}
                </span>
                <span>
                  {p.visitCount} visit{p.visitCount === 1 ? "" : "s"}
                  {p.lastDos && ` · last ${p.lastDos}`}
                  {p.discharged && " · discharged"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sb-clinic">
        {CLINIC.name}
        <span>Florida PIP</span>
      </div>

      <nav className="sb-nav">
        {nav.filter((n) => n.show).map((n) => {
          const active = "view" in n.action && n.action.view === props.view;
          return (
            <button key={n.label} className={`sb-link${active ? " active" : ""}`} onClick={() => props.onNavigate(n.action)}>
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="sb-user">
        <span className="sb-role">{props.roleLabel}</span>
        <span className="sb-email">{props.email}</span>
        <div className="sb-user-actions">
          <button className="btn ghost" onClick={props.onChangePassword}>
            Password
          </button>
          <button className="btn ghost" onClick={props.onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
