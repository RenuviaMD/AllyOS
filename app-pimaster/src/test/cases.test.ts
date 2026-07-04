import { describe, expect, it } from "vitest";
import { buildCaseIndex, caseActionItems, caseTimeline, filterGroups, groupCasesByPatient, type CaseReportRef } from "../lib/cases";
import { groupPackageDocs } from "../lib/today";
import { emptyForm, type VisitForm } from "../lib/types";

let seq = 0;
function ref(opts: {
  first?: string;
  last?: string;
  dob?: string;
  doa?: string;
  mode?: string;
  dos?: string;
  mutate?: (f: VisitForm) => void;
}): CaseReportRef {
  const f = emptyForm();
  f.patient.firstName = opts.first ?? "Maria";
  f.patient.lastName = opts.last ?? "Gomez";
  f.patient.dob = opts.dob ?? "1988-04-12";
  f.accident.accidentDate = opts.doa ?? "2026-06-20";
  opts.mutate?.(f);
  return {
    id: `r${++seq}`,
    mode: opts.mode ?? "initial",
    dos: opts.dos ?? "2026-06-21",
    created_at: (opts.dos ?? "2026-06-21") + "T10:00:00Z",
    form: f,
  };
}

describe("buildCaseIndex (one case per accident event)", () => {
  it("splits the same patient across two accident dates into two cases", () => {
    const cases = buildCaseIndex([
      ref({ doa: "2026-06-20", dos: "2026-06-21" }),
      ref({ doa: "2026-01-05", dos: "2026-01-06" }),
    ]);
    expect(cases).toHaveLength(2);
    expect(groupCasesByPatient(cases)).toHaveLength(1);
  });

  it("derives status from documented visits: initial → Active, +followup → In Treatment, +final → Discharged", () => {
    const initialOnly = buildCaseIndex([ref({ mode: "initial", mutate: (f) => (f.plan.emc = "yes") })]);
    expect(initialOnly[0].status).toBe("Active");
    const treatment = buildCaseIndex([ref({ mode: "initial" }), ref({ mode: "followup", dos: "2026-06-28" })]);
    expect(treatment[0].status).toBe("In Treatment");
    const done = buildCaseIndex([ref({ mode: "initial" }), ref({ mode: "final", dos: "2026-08-01" })]);
    expect(done[0].status).toBe("Discharged");
    const intake = buildCaseIndex([ref({ mode: "aob" })]);
    expect(intake[0].status).toBe("Intake");
  });

  it("reads the EMC determination from the initial note", () => {
    expect(buildCaseIndex([ref({ mutate: (f) => (f.plan.emc = "yes") })])[0].emc).toBe("Certified");
    expect(buildCaseIndex([ref({ mutate: (f) => (f.plan.emc = "no") })])[0].emc).toBe("Not Certified");
    expect(buildCaseIndex([ref({ mutate: (f) => (f.plan.emc = "deferred") })])[0].emc).toBe("Pending");
    expect(buildCaseIndex([ref({ mode: "aob" })])[0].emc).toBe("—");
  });

  it("filters groups by name or phone digits", () => {
    const cases = buildCaseIndex([
      ref({}),
      ref({ first: "John", last: "Smith", dob: "1975-03-02", mutate: (f) => (f.patient.phone = "786-555-9876") }),
    ]);
    const groups = groupCasesByPatient(cases);
    expect(filterGroups(groups, "gom")).toHaveLength(1);
    expect(filterGroups(groups, "9876")).toHaveLength(1);
    expect(filterGroups(groups, "9876")[0].name).toBe("Smith, John");
    expect(filterGroups(groups, "")).toHaveLength(2);
  });
});

describe("caseActionItems (U5 pinned action chips)", () => {
  it("pins EMC pending", () => {
    const c = buildCaseIndex([ref({ mutate: (f) => (f.plan.emc = "deferred") })])[0];
    const items = caseActionItems(c, undefined);
    expect(items.some((i) => i.kind === "emc")).toBe(true);
  });

  it("does not pin EMC once certified", () => {
    const c = buildCaseIndex([ref({ mutate: (f) => (f.plan.emc = "yes") })])[0];
    expect(caseActionItems(c, undefined).some((i) => i.kind === "emc")).toBe(false);
  });

  it("pins the unsigned reception packet and clears it when the forms are archived", () => {
    const c = buildCaseIndex([ref({ mutate: (f) => (f.plan.emc = "yes") })])[0];
    expect(caseActionItems(c, undefined).some((i) => i.kind === "packet")).toBe(true);
    const docs = groupPackageDocs([
      ref({ mode: "aob", dos: "2026-06-21" }),
      ref({ mode: "records_release", dos: "2026-06-21" }),
      ref({ mode: "attestation14", dos: "2026-06-21" }),
      ref({ mode: "pip_regulation", dos: "2026-06-21" }),
      ref({ mode: "excluded_services", dos: "2026-06-21" }),
    ]);
    expect(caseActionItems(c, docs[c.patientKey]).some((i) => i.kind === "packet")).toBe(false);
  });

  it("pins imaging ordered but never reviewed, and clears it after a documented review", () => {
    const withOrder = buildCaseIndex([
      ref({ mutate: (f) => { f.plan.emc = "yes"; f.imaging.selected = ["spine-cervical"]; } }),
    ])[0];
    expect(caseActionItems(withOrder, undefined).some((i) => i.kind === "imaging")).toBe(true);

    const reviewed = buildCaseIndex([
      ref({ mutate: (f) => { f.plan.emc = "yes"; f.imaging.selected = ["spine-cervical"]; } }),
      ref({
        mode: "followup",
        dos: "2026-06-28",
        mutate: (f) => (f.imagingReview.images = [{ name: "c-spine.pdf", reviewed: true }]),
      }),
    ])[0];
    expect(caseActionItems(reviewed, undefined).some((i) => i.kind === "imaging")).toBe(false);
  });
});

describe("clinical vs latest form separation", () => {
  it("keeps diagnosis data from the latest CLINICAL note even when a PT session is newer", () => {
    const c = buildCaseIndex([
      ref({ mode: "initial", dos: "2026-06-21", mutate: (f) => (f.assessment.autoCodes = [{ code: "S13.4XXA", desc: "Cervical sprain" }]) }),
      ref({ mode: "ptdaily", dos: "2026-06-24" }),
    ])[0];
    expect(c.latestClinicalForm?.assessment?.autoCodes?.[0]?.code).toBe("S13.4XXA");
    expect(c.latestForm?.visitType).toBe("initial"); // pt ref uses default initial type; latestForm is the newest report's form
  });

  it("keeps the packet action item pinned when the newest document is a PT session", () => {
    const c = buildCaseIndex([
      ref({ mode: "initial", dos: "2026-06-21", mutate: (f) => (f.plan.emc = "yes") }),
      ref({ mode: "ptdaily", dos: "2026-06-24", mutate: (f) => (f.visitType = "followup") }),
    ])[0];
    expect(caseActionItems(c, undefined).some((i) => i.kind === "packet")).toBe(true);
  });
});

describe("caseTimeline", () => {
  it("lists the chronological record newest-first", () => {
    const c = buildCaseIndex([
      ref({ mode: "initial", dos: "2026-06-21" }),
      ref({ mode: "ptdaily", dos: "2026-06-24" }),
      ref({ mode: "followup", dos: "2026-06-28" }),
    ])[0];
    const t = caseTimeline(c);
    expect(t.map((e) => e.dos)).toEqual(["2026-06-28", "2026-06-24", "2026-06-21"]);
    expect(t[0].title).toBe("Follow-Up Visit");
  });
});
