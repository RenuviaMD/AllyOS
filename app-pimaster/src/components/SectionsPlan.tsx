import { useEffect, useRef, useState } from "react";
import { EM_LEVELS, FOLLOW_UPS, IMAGING_GROUPS, OTHER_IMAGING_REGIONS, PROCEDURES, PT_DURATIONS, PT_FREQUENCIES, PT_MODALITIES } from "../lib/cpt";
import { deriveIcd10, PSYCH_CODES } from "../lib/icd10";
import { listDxCatalog, type DxCatalogRow } from "../lib/store";
import { imagingReviewNarrative, medicalNecessityTemplate } from "../lib/narratives";
import { Area, CheckGroup, Section, Select, YesNoField } from "./fields";
import type { SectionProps } from "./SectionsIntake";

export function Section6Assessment({ form, patch }: SectionProps) {
  const suppressed = form.assessment.suppressedCodes ?? [];
  // Derived codes minus the ones the physician explicitly removed (removals persist in form state)
  const visible = deriveIcd10(form).filter((d) => !suppressed.includes(d.code));
  const lastKey = useRef<string>("");
  const visKey = visible.map((d) => d.code).join(",");
  useEffect(() => {
    if (visKey !== lastKey.current) {
      lastKey.current = visKey;
      patch("assessment", { autoCodes: visible });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visKey]);

  const codes = form.assessment.autoCodes;
  return (
    <Section num={6} title="Assessment & ICD-10 Diagnosis" tag="Physician only">
      <p className="status">Auto-populated from documented exam findings. Remove any code or add manually below — physician retains final authority.</p>
      {codes.length === 0 && <p className="status warn">No exam impairment recorded yet — codes will appear as Section 5 is completed.</p>}
      <ul className="dx-list">
        {codes.map((d) => (
          <li key={d.code}>
            <span className="dx-code">{d.code}</span>
            <span>{d.desc}</span>
            <button
              type="button"
              className="dx-remove"
              title="Remove — this code will not be re-added automatically"
              onClick={() => patch("assessment", { suppressedCodes: [...suppressed, d.code] })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {suppressed.length > 0 && (
        <p className="status">
          Removed: {suppressed.join(", ")}{" "}
          <button type="button" className="btn ghost" style={{ padding: "1px 8px" }} onClick={() => patch("assessment", { suppressedCodes: [] })}>
            restore all
          </button>
        </p>
      )}
      {(form.assessment.extraCodes ?? []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label className="status">Complaint-derived &amp; physician-selected additions</label>
          <ul className="dx-list">
            {(form.assessment.extraCodes ?? []).map((d) => (
              <li key={d.code}>
                <span className="dx-code">{d.code}</span>
                <span>{d.desc}</span>
                <button
                  type="button"
                  className="dx-remove"
                  title="Remove this code"
                  onClick={() => patch("assessment", { extraCodes: (form.assessment.extraCodes ?? []).filter((x) => x.code !== d.code) })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CatalogQuickPicks form={form} patch={patch} />
      <div style={{ marginTop: 12 }}>
        <label className="status">Optional psychological diagnoses</label>
        <CheckGroup
          items={PSYCH_CODES.map((p) => ({ key: p.code, label: <span><span className="cpt">{p.code}</span> {p.desc}</span> }))}
          selected={form.assessment.psych}
          onChange={(sel) => patch("assessment", { psych: sel })}
        />
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        <Area
          label='Manual additions / overrides — one per line: "CODE description"'
          value={form.assessment.manual}
          onChange={(v) => patch("assessment", { manual: v })}
        />
      </div>
    </Section>
  );
}

/** Physician-selectable additions from the clinic ICD-10 catalog (feeding page). */
function CatalogQuickPicks({ form, patch }: SectionProps) {
  const [catalog, setCatalog] = useState<DxCatalogRow[]>([]);
  useEffect(() => {
    listDxCatalog()
      .then((rows) => setCatalog(rows.filter((r) => r.active && !r.auto_derive)))
      .catch(() => setCatalog([]));
  }, []);
  if (catalog.length === 0) return null;
  const selected = (form.assessment.extraCodes ?? []).map((d) => d.code);
  return (
    <div style={{ marginTop: 12 }}>
      <label className="status">Clinic catalog — physician-selected additions (not auto-derived)</label>
      <CheckGroup
        items={catalog.map((r) => ({
          key: r.code,
          label: (
            <span>
              <span className="cpt">{r.code}</span> {r.description}
            </span>
          ),
        }))}
        selected={selected}
        onChange={(sel) =>
          patch("assessment", {
            extraCodes: catalog.filter((r) => sel.includes(r.code)).map((r) => ({ code: r.code, desc: r.description })),
          })
        }
      />
    </div>
  );
}

export function Section7Plan({ form, patch }: SectionProps) {
  const p = form.plan;
  const necessityLabel = { initial: "Rationale for INITIATION of care", followup: "Rationale for CONTINUANCE + progress", final: "Rationale for CLOSURE of care" }[form.visitType];
  return (
    <Section num={7} title="Plan of Treatment" tag="Physician only">
      <div className="grid">
        <Select label="E/M Level" value={p.emLevel} onChange={(v) => patch("plan", { emLevel: v })} options={EM_LEVELS.map((e) => e.code)} labels={EM_LEVELS.map((e) => e.label)} />
        <Select label="PT Frequency" value={p.ptFrequency} onChange={(v) => patch("plan", { ptFrequency: v })} options={PT_FREQUENCIES} />
        <Select label="PT Duration" value={p.ptDuration} onChange={(v) => patch("plan", { ptDuration: v })} options={PT_DURATIONS} />
        <Select label="Follow-Up" value={p.followUp} onChange={(v) => patch("plan", { followUp: v })} options={FOLLOW_UPS} />
        {form.visitType === "initial" && (
          <Select
            label="EMC Determination (Fla. Stat. § 627.732(4)) — REQUIRED"
            value={p.emc}
            onChange={(v) => patch("plan", { emc: v as typeof p.emc })}
            options={["yes", "no", "deferred"]}
            labels={["YES — Emergency Medical Condition", "NO — no EMC identified", "DEFERRED — pending evaluation"]}
          />
        )}
        <Select
          label={`Causation Opinion${form.visitType !== "followup" ? " — REQUIRED" : ""}`}
          value={p.causation}
          onChange={(v) => patch("plan", { causation: v as typeof p.causation })}
          options={["related", "not-related", "undetermined"]}
          labels={["Causally related to accident", "Not causally related", "Undetermined at this time"]}
        />
        <Select
          label="Prognosis"
          value={p.prognosis}
          onChange={(v) => patch("plan", { prognosis: v as typeof p.prognosis })}
          options={["Excellent", "Good", "Fair", "Guarded", "Poor"]}
        />
        <div className="field grid-wide">
          <label>Medical Necessity — REQUIRED — {necessityLabel}</label>
          <textarea
            value={p.medicalNecessity}
            placeholder={medicalNecessityTemplate(form.visitType)}
            onChange={(e) => patch("plan", { medicalNecessity: e.target.value })}
          />
          {!p.medicalNecessity.trim() && (
            <button
              type="button"
              className="btn ghost"
              style={{ marginTop: 6 }}
              onClick={() => patch("plan", { medicalNecessity: medicalNecessityTemplate(form.visitType) })}
            >
              Insert template
            </button>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label className="status">PT Modalities (CPT)</label>
        <CheckGroup
          items={PT_MODALITIES.map((m) => ({
            key: m.cpt,
            label: (
              <span>
                <span className="cpt">{m.cpt}</span> {m.name} <span className="status">— {m.desc}</span>
              </span>
            ),
          }))}
          selected={p.modalities}
          onChange={(sel) => patch("plan", { modalities: sel })}
        />
      </div>
      {form.visitMode === "telehealth" ? (
        (p.procedures ?? []).length > 0 && (
          <p className="status warn" style={{ marginTop: 12 }}>
            In-office procedures are recorded on this visit but procedures are hands-on and cannot be performed via
            telehealth — remove them or change the visit to In-Person.
          </p>
        )
      ) : (
        <div style={{ marginTop: 12 }}>
          <label className="status">In-Office Procedures — PERFORMED this visit (bills with the fee schedule)</label>
          <CheckGroup
            items={PROCEDURES.map((pr) => ({
              key: pr.cpt,
              label: (
                <span>
                  <span className="cpt">{pr.cpt}</span> {pr.name}
                </span>
              ),
            }))}
            selected={p.procedures ?? []}
            onChange={(sel) => patch("plan", { procedures: sel })}
          />
          {(p.procedures ?? []).length > 0 && (
            <div className="grid" style={{ marginTop: 8 }}>
              <Area
                label="Procedure details — REQUIRED — muscles injected, medication & dose, patient tolerance"
                value={p.procedureNote ?? ""}
                onChange={(v) => patch("plan", { procedureNote: v })}
              />
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

export function Section8ImageOrders({ form, patch }: SectionProps) {
  const sel = form.imaging.selected;
  function items(groupId: string) {
    const g = IMAGING_GROUPS.find((x) => x.id === groupId)!;
    return g.items.flatMap((it) =>
      it.sided
        ? [
            { key: `${it.id}-R`, label: <span><span className="cpt">{it.cpt}</span> {it.label} (Right)</span> },
            { key: `${it.id}-L`, label: <span><span className="cpt">{it.cpt}</span> {it.label} (Left)</span> },
          ]
        : [{ key: it.id, label: <span><span className="cpt">{it.cpt}</span> {it.label}</span> }],
    );
  }
  return (
    <Section num={8} title="Image Orders" tag="Initial visit only · Physician only">
      <p className="status">Generates a printable X-ray order on clinic letterhead addressed to MAZEL Medical Center. (No skull section.)</p>
      {IMAGING_GROUPS.map((g) => (
        <div key={g.id} style={{ marginBottom: 12 }}>
          <label className="status" style={{ textTransform: "uppercase", letterSpacing: 1 }}>{g.label}</label>
          <CheckGroup items={items(g.id)} selected={sel} onChange={(s) => patch("imaging", { selected: s })} />
        </div>
      ))}
      <div className="grid">
        <Select label="MRI (region)" value={form.imaging.mriRegion} onChange={(v) => patch("imaging", { mriRegion: v })} options={OTHER_IMAGING_REGIONS} />
        <Select label="CT (region)" value={form.imaging.ctRegion} onChange={(v) => patch("imaging", { ctRegion: v })} options={OTHER_IMAGING_REGIONS} />
        <Select label="Ultrasound (region)" value={form.imaging.usRegion} onChange={(v) => patch("imaging", { usRegion: v })} options={OTHER_IMAGING_REGIONS} />
      </div>
    </Section>
  );
}

export function Section9ImagingReview({ form, patch, readOnly }: SectionProps) {
  const review = form.imagingReview;
  const [over, setOver] = useState<"available" | "reviewed" | null>(null);
  const narrative = imagingReviewNarrative(review);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const names = [...files].map((f) => f.name);
    const existing = new Set(review.images.map((i) => i.name));
    const added = names.filter((n) => !existing.has(n)).map((name) => ({ name, reviewed: false }));
    if (added.length) patch("imagingReview", { images: [...review.images, ...added] });
  }

  function setReviewed(name: string, reviewed: boolean) {
    patch("imagingReview", { images: review.images.map((i) => (i.name === name ? { ...i, reviewed } : i)) });
  }

  function onDrop(target: "available" | "reviewed", e: React.DragEvent) {
    e.preventDefault();
    setOver(null);
    const name = e.dataTransfer.getData("text/pi-image");
    if (name) setReviewed(name, target === "reviewed");
    else if (target === "available") addFiles(e.dataTransfer.files);
  }

  const available = review.images.filter((i) => !i.reviewed);
  const reviewed = review.images.filter((i) => i.reviewed);

  function list(items: typeof available, badge: string) {
    return items.map((i) => (
      <div
        key={i.name}
        className="img-row"
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/pi-image", i.name)}
      >
        📄 {i.name}
        <span className={`badge${i.reviewed ? " reviewed" : ""}`}>{badge}</span>
        <button
          type="button"
          className="btn ghost"
          style={{ marginLeft: "auto", padding: "2px 8px" }}
          onClick={() => setReviewed(i.name, !i.reviewed)}
        >
          {i.reviewed ? "Undo" : "Mark reviewed"}
        </button>
      </div>
    ));
  }

  return (
    <Section num={9} title="Follow-Up Imaging Review" tag="Follow-up visit · Physician" readOnly={readOnly}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div
          className={`dropzone${over === "available" ? " over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver("available"); }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => onDrop("available", e)}
        >
          <strong>Available studies</strong>
          <div className="status">Drop MAZEL report files here (or click to browse)</div>
          <input type="file" multiple accept=".pdf,image/*" style={{ marginTop: 8 }} onChange={(e) => addFiles(e.target.files)} />
          {list(available, "pending")}
        </div>
        <div
          className={`dropzone${over === "reviewed" ? " over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver("reviewed"); }}
          onDragLeave={() => setOver(null)}
          onDrop={(e) => onDrop("reviewed", e)}
        >
          <strong>Reviewed ✓</strong>
          <div className="status">Drag studies here once reviewed</div>
          {list(reviewed, "reviewed")}
        </div>
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        <Area label="Imaging Findings" value={review.findings} onChange={(v) => patch("imagingReview", { findings: v })} />
        <YesNoField label="Discussed with Patient" value={review.discussed} onChange={(v) => patch("imagingReview", { discussed: v })} />
      </div>
      {narrative && <div className="narr">{narrative}</div>}
    </Section>
  );
}
