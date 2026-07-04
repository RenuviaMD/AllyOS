import { useState } from "react";
import { draftInitialReport } from "../lib/ai";
import { sanitizeHtml } from "../lib/report";
import type { SectionProps } from "./SectionsIntake";
import { Area } from "./fields";

/**
 * AI Initial Medical Evaluation Report (Dr. Falcon's locked generation specs,
 * telehealth / in-person selected by the visit's modality). The physician
 * supplies the clinical input, generates, REVIEWS the rendered draft (missing
 * items are highlighted), edits if needed, and approves. The approved report
 * becomes the clinical note — printed via Generate Clinical Note, which runs
 * the usual audits and clone guard.
 */
export function AiReportPanel({ form, patch, onClose, inline }: SectionProps & { onClose?: () => void; inline?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [editHtml, setEditHtml] = useState(false);
  const draft = form.ai?.reportDraft ?? "";

  async function generate() {
    setBusy(true);
    setStatus("Drafting the full report — this takes 30–60 seconds…");
    const res = await draftInitialReport(form);
    setBusy(false);
    if (res.ok && res.narrative) {
      patch("ai", { reportDraft: res.narrative });
      setStatus("Draft ready. Review below — anything in the orange block is MISSING and needs your input (add it to the clinical input and re-generate, or edit directly).");
    } else {
      setStatus(`Draft failed: ${res.error}`);
    }
  }

  // Preview substitutes the real identifiers (client-side only) but KEEPS the
  // missing-items block visible; printing strips it.
  const preview = draft
    ? sanitizeHtml(draft)
        .replace(/\[PATIENT_NAME\]/g, `${form.patient.firstName} ${form.patient.lastName}`.trim())
        .replace(/\[PATIENT_DOB\]/g, form.patient.dob)
    : "";

  const title = `AI Initial Evaluation Report — ${form.visitMode === "telehealth" ? "Telehealth (§ 456.47)" : "In-Person"}`;

  const body = (
    <>
        {!inline && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>{title}</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={onClose}>Close</button>
        </div>
        )}
        <p className="status">
          Generated to the locked Florida-PIP specification for this visit's modality, strictly from the intake data and
          your clinical input below — nothing is invented; missing facts are listed for you instead. Names and DOB never
          reach the AI (substituted locally). The approved report becomes the clinical note.
        </p>
        <div className="grid">
          <Area
            label="Clinical input — complaints per region with pain n/10, onset timing, radicular sx, LOC, external trauma, meds, allergies, prior accidents (look-back), social hx (tobacco/vape, alcohol, coffee, cannabis), ROS positives; in-person: tests performed with results/degrees"
            value={form.ai?.hpiNotes ?? ""}
            onChange={(v) => patch("ai", { hpiNotes: v })}
          />
        </div>
        <div className="toolbar" style={{ margin: "10px 0" }}>
          <button className="btn gold" disabled={busy} onClick={generate}>
            {busy ? "Drafting…" : draft ? "Re-generate report" : "Generate report"}
          </button>
          {draft && (
            <>
              <button className="btn ghost" onClick={() => setEditHtml(!editHtml)}>{editHtml ? "Show preview" : "Edit source"}</button>
              <button className="btn ghost" onClick={() => { patch("ai", { reportDraft: "" }); setStatus("Draft discarded — the composed note format will be used."); }}>
                Discard draft
              </button>
            </>
          )}
          <span className="status">{status}</span>
        </div>
        {draft && !editHtml && (
          <div
            style={{ background: "#fff", color: "#1c2833", borderRadius: 6, padding: "18px 22px", fontFamily: "Georgia, serif", fontSize: 13 }}
            // reviewed physician content; sanitized above
            dangerouslySetInnerHTML={{
              __html: `<style>.draft-gaps{border:2px solid #e67e22;background:#fdf3e7;padding:8px 12px;margin-top:14px}</style>${preview}`,
            }}
          />
        )}
        {draft && editHtml && (
          <div className="grid">
            <Area label="Report source (advanced editing)" value={draft} onChange={(v) => patch("ai", { reportDraft: v })} />
          </div>
        )}
        {draft && (
          <p className="status" style={{ marginTop: 10 }}>
            When it reads right: click <strong>Generate Clinical Note</strong> — the approved report prints as the note
            (audits and same-accident clone guard still apply). The missing-items block never prints.
          </p>
        )}
    </>
  );

  // Inline on the encounter's Sign step (U7) — the modal wrapper remains for callers that still open it as a panel.
  if (inline) {
    return (
      <div className="section" style={{ borderColor: "var(--gold)" }}>
        <div className="section-head">
          <span className="section-title">{title}</span>
          <span className="section-tag">AI drafting</span>
        </div>
        <div className="section-body">{body}</div>
      </div>
    );
  }
  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(980px, 96vw)", maxHeight: "92vh", overflowY: "auto" }}>{body}</div>
    </div>
  );
}
