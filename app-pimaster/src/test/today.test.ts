import { describe, expect, it } from "vitest";
import { buildTodayRows, CLINICAL_MODES, groupPackageDocs, packetStatus, patientKeyOf, type DayReportLike } from "../lib/today";
import { emptyForm } from "../lib/types";

function report(partial: Partial<DayReportLike> & { first?: string; last?: string; dob?: string }): DayReportLike {
  const form = emptyForm();
  form.patient.firstName = partial.first ?? "Jane";
  form.patient.lastName = partial.last ?? "Doe";
  form.patient.dob = partial.dob ?? "1980-01-15";
  return {
    id: partial.id ?? "r1",
    mode: partial.mode ?? "initial",
    dos: partial.dos ?? "2026-07-04",
    created_at: partial.created_at ?? "2026-07-04T14:30:00Z",
    form: { ...form, visitType: (partial.form?.visitType as never) ?? form.visitType, visitMode: (partial.form?.visitMode as never) ?? form.visitMode },
  };
}

describe("buildTodayRows (U1 landing)", () => {
  it("groups multiple documents for the same patient into one row", () => {
    const rows = buildTodayRows(
      [report({ id: "a", mode: "initial" }), report({ id: "b", mode: "aob" })],
      null,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].documented.map((d) => d.mode)).toEqual(["initial", "aob"]);
    expect(rows[0].name).toBe("Doe, Jane");
  });

  it("keeps different patients separate (name+DOB identity)", () => {
    const rows = buildTodayRows(
      [report({ id: "a" }), report({ id: "b", first: "John", last: "Smith", dob: "1975-03-02" })],
      null,
    );
    expect(rows).toHaveLength(2);
  });

  it("merges the active draft into the matching patient row and puts it first", () => {
    const draft = emptyForm();
    draft.patient.firstName = "Jane";
    draft.patient.lastName = "Doe";
    draft.patient.dob = "1980-01-15";
    const rows = buildTodayRows(
      [report({ id: "b", first: "John", last: "Smith", dob: "1975-03-02" }), report({ id: "a" })],
      draft,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].hasDraft).toBe(true);
    expect(rows[0].name).toBe("Doe, Jane");
  });

  it("adds a draft-only patient as its own open-encounter row", () => {
    const draft = emptyForm();
    draft.patient.firstName = "New";
    draft.patient.lastName = "Patient";
    const rows = buildTodayRows([], draft);
    expect(rows).toHaveLength(1);
    expect(rows[0].hasDraft).toBe(true);
    expect(rows[0].documented).toHaveLength(0);
  });

  it("ignores a blank draft (no patient yet)", () => {
    expect(buildTodayRows([], emptyForm())).toHaveLength(0);
  });

  it("applies the role mode filter (physician sees clinical notes only)", () => {
    const rows = buildTodayRows(
      [report({ id: "a", mode: "aob" }), report({ id: "b", mode: "initial" })],
      null,
      (m) => CLINICAL_MODES.includes(m),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].documented.map((d) => d.mode)).toEqual(["initial"]);
  });
});

describe("packetStatus (staff landing)", () => {
  const key = patientKeyOf("Jane", "Doe", "1980-01-15");

  it("lists the three once-per-patient staff forms as missing on a fresh initial visit", () => {
    const form = emptyForm(); // initial, in-person
    const s = packetStatus(form, undefined, "2026-07-04");
    expect(s.done).toHaveLength(0);
    expect(s.missing).toEqual([
      "Assignment of Benefits (AOB)",
      "Medical Records Release (HIPAA)",
      "PIP 14-Day Attestation",
    ]);
  });

  it("counts once-per-patient forms signed on ANY prior date", () => {
    const docs = groupPackageDocs([
      report({ id: "1", mode: "aob", dos: "2026-06-20" }),
      report({ id: "2", mode: "records_release", dos: "2026-06-20" }),
      report({ id: "3", mode: "attestation14", dos: "2026-06-20" }),
    ]);
    const s = packetStatus(emptyForm(), docs[key], "2026-07-04");
    expect(s.missing).toHaveLength(0);
    expect(s.done).toHaveLength(3);
  });

  it("requires the telehealth consent to be signed for THIS date of service", () => {
    const form = emptyForm();
    form.visitMode = "telehealth";
    const oldConsent = groupPackageDocs([report({ id: "1", mode: "telehealth_consent", dos: "2026-06-20" })]);
    const s1 = packetStatus(form, oldConsent[key], "2026-07-04");
    expect(s1.missing).toContain("Telehealth Informed Consent");
    const todayConsent = groupPackageDocs([report({ id: "1", mode: "telehealth_consent", dos: "2026-07-04" })]);
    const s2 = packetStatus(form, todayConsent[key], "2026-07-04");
    expect(s2.missing).not.toContain("Telehealth Informed Consent");
  });

  it("never asks staff for the physician's affidavit", () => {
    const s = packetStatus(emptyForm(), undefined, "2026-07-04");
    expect([...s.done, ...s.missing].join()).not.toMatch(/Affidavit/);
  });

  it("has nothing to collect on an in-person follow-up (once-per-patient forms live on the initial)", () => {
    const form = emptyForm();
    form.visitType = "followup";
    const s = packetStatus(form, undefined, "2026-07-04");
    expect(s.missing).toHaveLength(0);
  });
});
