import { useEffect, useRef, useState } from "react";
import { ReportsArchive } from "./components/ReportsArchive";
import { Section10Discharge, Section3Pmh, Section4GeneralExam, Section5Exam } from "./components/SectionsExam";
import { Section1CheckIn, Section2Injury, TelehealthConsent } from "./components/SectionsIntake";
import { Section11PtDaily, Section12PtWeekly } from "./components/SectionsPt";
import { Section6Assessment, Section7Plan, Section8ImageOrders, Section9ImagingReview } from "./components/SectionsPlan";
import { BillingSettingsCard } from "./components/BillingSettings";
import { CatalogPage } from "./components/CatalogPage";
import { AhcaExportPage } from "./components/AhcaExport";
import { SignInScreen } from "./components/SignIn";
import { allowedViews, changePassword, fetchAuthState, onAuthChange, signOut, type AuthState } from "./lib/auth";
import { auditNote } from "./lib/audit";
import { buildServiceLines, loadBillingSettings } from "./lib/billing";
import { CLINIC } from "./lib/clinic";
import { injuryNarrative } from "./lib/narratives";
import {
  allCptCodes,
  allDiagnosisCodes,
  buildClinicalNoteHtml,
  buildCms1500Html,
  buildEmcCertificationHtml,
  buildPtReportHtml,
  buildSuperbillHtml,
  buildXrayOrderHtml,
  printHtml,
} from "./lib/report";
import {
  compareToPeers,
  findingsSet,
  FINDINGS_SIMILARITY_WARN,
  narrativeFingerprint,
  TEXT_SIMILARITY_LIMIT,
  type PeerNote,
  type SimilarityHit,
} from "./lib/similarity";
import { fetchSameAccidentForms, loadDraft, saveDraft, saveReport, syncBillingFromCloud, type ReportMode } from "./lib/store";
import { emptyForm, type Role, type VisitForm, type VisitMode, type VisitType } from "./lib/types";

const VISIT_LABELS: Record<VisitType, string> = { initial: "Initial", followup: "Follow-Up", final: "Final" };
const MODE_LABELS: Record<VisitMode, string> = { inPerson: "In-Person", telehealth: "Telehealth" };
const ROLE_LABELS: Record<Role, string> = { staff: "Staff", physician: "Physician", pt: "Physical Therapist" };

export default function App() {
  const [auth, setAuth] = useState<AuthState | null | undefined>(undefined);
  const [role, setRole] = useState<Role>(() => (localStorage.getItem("pimaster-role") as Role) || "staff");
  const [form, setForm] = useState<VisitForm>(emptyForm);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "cloud" | "local">("idle");
  const [genState, setGenState] = useState<string>("");
  const [auditIssues, setAuditIssues] = useState<string[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCatalogs, setShowCatalogs] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const refresh = () => fetchAuthState().then(setAuth);
    refresh();
    return onAuthChange(refresh);
  }, []);

  useEffect(() => {
    if (!auth) return;
    loadDraft().then((d) => {
      if (d) setForm({ ...emptyForm(), ...d });
      loaded.current = true;
    });
    syncBillingFromCloud().catch(() => {});
  }, [auth?.userId]);

  // Debounced autosave
  useEffect(() => {
    if (!loaded.current) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const where = await saveDraft(form);
      setSaveState(where);
    }, 800);
    return () => clearTimeout(t);
  }, [form]);

  function patch<S extends keyof VisitForm>(section: S, partial: Partial<VisitForm[S]>) {
    setForm((f) => ({ ...f, [section]: { ...(f[section] as object), ...partial } as VisitForm[S] }));
  }

  function setVisitType(v: VisitType) {
    setForm((f) => ({ ...f, visitType: v }));
  }

  function setVisitMode(v: VisitMode) {
    setForm((f) => ({ ...f, visitMode: v }));
  }

  function chooseRole(r: Role) {
    setRole(r);
    localStorage.setItem("pimaster-role", r);
  }

  const views = auth ? allowedViews(auth.roles) : [];
  useEffect(() => {
    if (auth && views.length > 0 && !views.includes(role)) setRole(views[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.userId, views.join(",")]);

  async function doChangePassword() {
    const pw = prompt("New password (min 8 characters):");
    if (!pw) return;
    const err = await changePassword(pw);
    alert(err ? `Could not change password: ${err}` : "Password updated.");
  }

  const vt = form.visitType;
  const show = {
    s1: true,
    s2: true,
    s3: role === "physician",
    s4: role === "physician",
    s5: role === "physician",
    s6: role === "physician",
    s7: role === "physician",
    s8: role === "physician" && vt === "initial",
    s9: (role === "physician" || role === "pt") && vt === "followup",
    s10: role === "physician" && vt === "final",
    s11: role === "pt",
    s12: role === "pt",
  };

  /** Same-accident clone guard: compares narrative + exam findings against other patients from the same accident. */
  async function runCloneGuard(): Promise<{ blockers: string[]; warnings: string[]; hits: SimilarityHit[] }> {
    const peers = await fetchSameAccidentForms(
      form.accident.accidentDate,
      `${form.patient.firstName} ${form.patient.lastName}`,
    );
    const peerNotes: PeerNote[] = [];
    for (const p of peers) {
      try {
        peerNotes.push({
          patientLabel: `${p.patient.firstName} ${p.patient.lastName}`,
          narrative: narrativeFingerprint(p, injuryNarrative(p.patient, p.accident)),
          findings: findingsSet({ romExam: p.romExam ?? {}, spineExam: p.spineExam, jointTenderness: p.jointTenderness ?? {} }),
        });
      } catch {
        // older-format report — skip
      }
    }
    const mine = narrativeFingerprint(form, injuryNarrative(form.patient, form.accident));
    const hits = compareToPeers(mine, findingsSet(form), peerNotes);
    const blockers: string[] = [];
    const warnings: string[] = [];
    for (const h of hits) {
      const pct = Math.round(h.textSimilarity * 100);
      if (h.textSimilarity > TEXT_SIMILARITY_LIMIT) {
        blockers.push(
          `Note narrative is ${pct}% similar to the note for ${h.otherPatient} (same accident — limit 20%). Document this patient's distinct history, complaints, and findings.`,
        );
      }
      if (h.findingsSimilarity > FINDINGS_SIMILARITY_WARN) {
        warnings.push(
          `Exam findings are nearly identical to ${h.otherPatient} (same accident). Document each patient's distinguishing findings — do not fabricate differences.`,
        );
      }
    }
    return { blockers, warnings, hits };
  }

  async function generate(kind: "note" | "xray" | "emc" | "superbill" | "cms1500" | "ptdaily" | "ptprogress") {
    const settings = loadBillingSettings();

    if (kind === "emc") {
      if (form.visitType !== "initial" || form.plan.emc !== "yes") {
        setGenState("EMC certification is issued on initial visits with EMC determination = YES.");
        return;
      }
      printHtml(buildEmcCertificationHtml(form));
      setGenState("EMC certification opened for print.");
      return;
    }
    if (kind === "superbill" || kind === "cms1500") {
      const lines = buildServiceLines(form, settings, role === "pt" ? "pt" : "md");
      if (lines.length === 0) {
        setGenState(role === "pt" ? "Select treatments provided (Section 11) first." : "Select an E/M level (Section 7) first.");
        return;
      }
      const issues: string[] = [];
      if (!settings.ein) issues.push("⚠️ Federal Tax ID (EIN) is not set — open Billing Settings.");
      if (lines.some((l) => !l.charge)) issues.push("⚠️ Some services have no charge configured — they print blank.");
      setAuditIssues(issues);
      printHtml(
        kind === "superbill"
          ? buildSuperbillHtml(form, lines, settings, role === "pt" ? "pt" : "md")
          : buildCms1500Html(form, lines, settings),
      );
      setGenState(`${kind === "superbill" ? "Superbill" : "CMS-1500"} opened for print.`);
      return;
    }

    let cloneHits: SimilarityHit[] = [];
    if (kind === "note") {
      setGenState("Auditing…");
      const audit = auditNote(form);
      const clone = await runCloneGuard();
      cloneHits = clone.hits;
      const errors = [...audit.errors, ...clone.blockers];
      const warnings = [...audit.warnings, ...clone.warnings];
      setAuditIssues([...errors.map((e) => `⛔ ${e}`), ...warnings.map((w) => `⚠️ ${w}`)]);
      if (errors.length > 0) {
        setGenState("Audit failed — resolve the items above before generating the note.");
        return;
      }
    }
    setGenState("Generating…");
    let html: string;
    let mode: ReportMode;
    if (kind === "note") {
      html = buildClinicalNoteHtml(form);
      mode = vt;
    } else if (kind === "xray") {
      html = buildXrayOrderHtml(form);
      mode = vt;
    } else {
      html = buildPtReportHtml(form, kind);
      mode = kind;
    }
    printHtml(html);
    if (kind === "xray") {
      setGenState("X-ray order opened for print/fax.");
      return;
    }
    const res = await saveReport({
      mode,
      dos: form.visitDate,
      form,
      html,
      icdCodes: allDiagnosisCodes(form).map((d) => d.code),
      cptCodes: allCptCodes(form),
      auditTrail:
        kind === "note"
          ? {
              auditedAt: new Date().toISOString(),
              visitMode: form.visitMode,
              cloneGuard: cloneHits.map((h) => ({
                otherPatient: h.otherPatient,
                textSimilarityPct: Math.round(h.textSimilarity * 100),
                findingsSimilarityPct: Math.round(h.findingsSimilarity * 100),
              })),
            }
          : undefined,
    });
    setGenState(res.ok ? "Report saved to records." : `Report generated, but cloud save failed: ${res.error}`);
  }

  function newVisit() {
    if (!confirm("Start a new blank visit? The current draft will be replaced.")) return;
    setForm(emptyForm());
  }

  if (auth === undefined) {
    return <div style={{ padding: 60, textAlign: "center" }} className="status">Loading…</div>;
  }
  if (auth === null) {
    return <SignInScreen onSignedIn={() => fetchAuthState().then(setAuth)} />;
  }
  if (views.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p className="status warn">This account ({auth.email}) has no clinic role assigned. Contact the administrator.</p>
        <button className="btn ghost" onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-title">PI MASTER™</span>
          <span className="brand-sub">by RenuviaMD® Network — {CLINIC.name}</span>
        </div>
        <div className="seg">
          {(Object.keys(VISIT_LABELS) as VisitType[]).map((v) => (
            <button key={v} className={vt === v ? "active" : ""} onClick={() => setVisitType(v)}>
              {VISIT_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="seg">
          {(Object.keys(MODE_LABELS) as VisitMode[]).map((v) => (
            <button key={v} className={form.visitMode === v ? "active" : ""} onClick={() => setVisitMode(v)}>
              {MODE_LABELS[v]}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="seg">
          {views.map((r) => (
            <button key={r} className={role === r ? "active" : ""} onClick={() => chooseRole(r)}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <span className={`status ${saveState === "cloud" ? "ok" : saveState === "local" ? "warn" : ""}`}>
          {saveState === "saving" && "Saving…"}
          {saveState === "cloud" && "✓ Saved"}
          {saveState === "local" && "Saved locally (offline)"}
        </span>
        <span className="status">{auth.email}</span>
        <button className="btn ghost" onClick={doChangePassword} title="Change password">
          Password
        </button>
        <button className="btn ghost" onClick={() => signOut()}>
          Sign out
        </button>
      </header>

      <main className="main">
        {form.visitMode === "telehealth" && role !== "pt" && <TelehealthConsent form={form} patch={patch} />}
        {show.s1 && <Section1CheckIn form={form} patch={patch} />}
        {show.s2 && <Section2Injury form={form} patch={patch} readOnly={role === "staff"} />}
        {show.s3 && <Section3Pmh form={form} patch={patch} />}
        {show.s4 && <Section4GeneralExam form={form} patch={patch} />}
        {show.s5 && <Section5Exam form={form} patch={patch} />}
        {show.s6 && <Section6Assessment form={form} patch={patch} />}
        {show.s7 && <Section7Plan form={form} patch={patch} />}
        {show.s8 && <Section8ImageOrders form={form} patch={patch} />}
        {show.s9 && <Section9ImagingReview form={form} patch={patch} readOnly={role === "pt"} />}
        {show.s10 && <Section10Discharge form={form} patch={patch} />}
        {show.s11 && <Section11PtDaily form={form} patch={patch} />}
        {show.s12 && <Section12PtWeekly form={form} patch={patch} />}

        {auditIssues.length > 0 && (
          <div className="section" style={{ borderColor: "var(--warning)" }}>
            <div className="section-head">
              <span className="section-title">Note Audit</span>
            </div>
            <div className="section-body">
              <ul className="dx-list">
                {auditIssues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="toolbar">
          {role === "physician" && (
            <>
              <button className="btn" onClick={() => generate("note")}>
                Generate Clinical Note {vt === "final" ? "+ Close Case" : ""}
              </button>
              {vt === "initial" && (
                <button className="btn gold" onClick={() => generate("xray")}>
                  Imaging Order
                </button>
              )}
              {vt === "initial" && form.plan.emc === "yes" && (
                <button className="btn gold" onClick={() => generate("emc")}>
                  EMC Certification
                </button>
              )}
            </>
          )}
          {role === "pt" && (
            <>
              <button className="btn" onClick={() => generate("ptdaily")}>
                Generate PT Daily Note
              </button>
              <button className="btn" onClick={() => generate("ptprogress")}>
                Generate PT Weekly Summary
              </button>
            </>
          )}
          {role !== "staff" && (
            <>
              <button className="btn ghost" onClick={() => generate("superbill")}>
                Superbill
              </button>
              <button className="btn ghost" onClick={() => generate("cms1500")}>
                CMS-1500
              </button>
              <button className="btn ghost" onClick={() => setShowBilling(true)}>
                Billing Settings
              </button>
            </>
          )}
          {role === "physician" && (
            <>
              <button className="btn ghost" onClick={() => setShowExport(true)}>
                Encounter Export
              </button>
              <button className="btn ghost" onClick={() => setShowCatalogs(true)}>
                Catalogs
              </button>
            </>
          )}
          <button className="btn ghost" onClick={() => setShowArchive(true)}>
            Reports Archive
          </button>
          <button className="btn ghost" onClick={newVisit}>
            New Visit
          </button>
          <span className="status">{genState}</span>
        </div>
      </main>

      {showArchive && <ReportsArchive onClose={() => setShowArchive(false)} />}
      {showBilling && <BillingSettingsCard onClose={() => setShowBilling(false)} />}
      {showExport && <AhcaExportPage onClose={() => setShowExport(false)} />}
      {showCatalogs && <CatalogPage onClose={() => setShowCatalogs(false)} />}
    </>
  );
}
