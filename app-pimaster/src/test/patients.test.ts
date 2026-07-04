import { describe, expect, it } from "vitest";
import { buildPatientIndex, searchPatients, type ReportMetaLike } from "../lib/patients";
import { emptyForm } from "../lib/types";

function meta(first: string, last: string, dob: string, opts: Partial<{ mode: string; dos: string; phone: string; carrier: string }> = {}): ReportMetaLike {
  const form = emptyForm();
  form.patient.firstName = first;
  form.patient.lastName = last;
  form.patient.dob = dob;
  form.patient.phone = opts.phone ?? "";
  form.patient.insuranceCarrier = opts.carrier ?? "";
  return { id: Math.random().toString(36).slice(2), mode: opts.mode ?? "initial", dos: opts.dos ?? "2026-07-01", form };
}

const rows: ReportMetaLike[] = [
  meta("Maria", "Gomez", "1988-04-12", { mode: "initial", dos: "2026-06-20", phone: "(305) 555-1234", carrier: "Progressive" }),
  meta("Maria", "Gomez", "1988-04-12", { mode: "followup", dos: "2026-07-01", phone: "(305) 555-1234" }),
  meta("Maria", "Gomez", "1988-04-12", { mode: "aob", dos: "2026-06-20" }),
  meta("John", "Smith", "1975-03-02", { mode: "final", dos: "2026-06-28", phone: "786-555-9876" }),
  meta("Johanna", "Smithers", "1990-11-30", { mode: "initial", dos: "2026-07-02" }),
];

describe("buildPatientIndex (U6 search)", () => {
  it("groups reports per person and counts clinical visits only", () => {
    const idx = buildPatientIndex(rows);
    expect(idx).toHaveLength(3);
    const gomez = idx.find((e) => e.last === "Gomez")!;
    expect(gomez.visitCount).toBe(2); // aob is not a visit
    expect(gomez.lastDos).toBe("2026-07-01");
    expect(gomez.phoneDigits).toBe("3055551234");
    expect(gomez.carrier).toBe("Progressive");
  });

  it("marks a patient discharged once a final note exists", () => {
    const idx = buildPatientIndex(rows);
    expect(idx.find((e) => e.last === "Smith")!.discharged).toBe(true);
    expect(idx.find((e) => e.last === "Gomez")!.discharged).toBe(false);
  });
});

describe("searchPatients (3+ chars of last, first, or phone digits)", () => {
  const idx = buildPatientIndex(rows);

  it("stays inactive under 3 characters", () => {
    expect(searchPatients(idx, "go")).toHaveLength(0);
    expect(searchPatients(idx, "")).toHaveLength(0);
  });

  it("matches last-name prefix", () => {
    const r = searchPatients(idx, "gom");
    expect(r.map((e) => e.last)).toEqual(["Gomez"]);
  });

  it("matches first-name prefix and returns both Smiths on a shared prefix", () => {
    expect(searchPatients(idx, "mar").map((e) => e.last)).toEqual(["Gomez"]);
    expect(searchPatients(idx, "smi").map((e) => e.last).sort()).toEqual(["Smith", "Smithers"]);
  });

  it("matches phone digits anywhere in the number", () => {
    expect(searchPatients(idx, "5551234").map((e) => e.last)).toEqual(["Gomez"]);
    expect(searchPatients(idx, "786").map((e) => e.last)).toEqual(["Smith"]);
  });

  it("matches formatted phone queries (digits with punctuation)", () => {
    expect(searchPatients(idx, "555-9876").map((e) => e.last)).toEqual(["Smith"]);
  });

  it("returns nothing on a non-matching query", () => {
    expect(searchPatients(idx, "zzz")).toHaveLength(0);
  });
});
