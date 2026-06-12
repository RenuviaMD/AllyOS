import { useEffect, useRef, useState } from "react";
import { ReportsArchive } from "./components/ReportsArchive";
import { Section10Discharge, Section3Pmh, Section4GeneralExam, Section5Exam } from "./components/SectionsExam";
import { Section1CheckIn, Section2Injury, TelehealthConsent } from "./components/SectionsIntake";
import { Section11PtDaily, Section12PtWeekly } from "./components/SectionsPt";
import { Section6Assessment, Section7Plan, Section8ImageOrders, Section9ImagingReview } from "./components/SectionsPlan";
import { auditNote } from "./lib/audit";
import { CLINIC } from "./lib/clinic";
import { allCptCodes, allDiagnosisCodes, buildClinicalNoteHtml, buildPtReportHtml, buildXrayOrderHtml, printHtml } from "./lib/report";
import { loadDraft, saveDraft, saveReport, type ReportMode } from "./lib/store";
import { emptyForm, type Role, type VisitForm, type VisitMode, type VisitType } from "./lib/types";

const VISIT_LABELS: Record<VisitType, string> = { initial: "Initial", followup: "Follow-Up", final: "Final" };
const MODE_LABELS: Record<VisitMode, string> = { inPerson: "In-Person", telehealth: "Telehealth" };
const ROLE_LABELS: Record<Role, string> = { staff: "Staff", physician: "Physician", pt: "Physical Therapist" };

export default function App() {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem("pimaster-role") as Role) || "staff");
  const [form, setForm] = useState<VisitForm>(emptyForm);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "cloud" | "local">("idle");
  const [genState, setGenState] = useState<string>("");
  const [auditIssues, setAuditIssues] = useState<string[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loadDraft().then((d) => {
      if (d) setForm({ ...emptyForm(), ...d });
      loaded.current = true;
    });
  }, []);

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

  async function generate(kind: "note" | "xray" | "ptdaily" | "ptprogress") {
    if (kind === "note") {
      const audit = auditNote(form);
      setAuditIssues([...audit.errors.map((e) => `⛔ ${e}`), ...audit.warnings.map((w) => `⚠️ ${w}`)]);
      if (audit.errors.length > 0) {
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
    });
    setGenState(res.ok ? "Report saved to records." : `Report generated, but cloud save failed: ${res.error}`);
  }

  function newVisit() {
    if (!confirm("Start a new blank visit? The current draft will be replaced.")) return;
    setForm(emptyForm());
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
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
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
                  Generate X-Ray Order (MAZEL)
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
    </>
  );
}
