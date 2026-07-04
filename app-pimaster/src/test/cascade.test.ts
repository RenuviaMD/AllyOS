import { describe, expect, it } from "vitest";
import { buildCascade } from "../lib/cascade";
import { buildClinicalNoteHtml } from "../lib/report";
import { emptyForm } from "../lib/types";

describe("complaint-driven cascade — region in, everything out", () => {
  it("right knee complaint generates the whole right-knee thread", () => {
    const f = emptyForm();
    f.complaints = [{ region: "knee", side: "R", pain: "6", note: "worse with stairs" }];
    const res = buildCascade(f);
    const codes = res.extraCodes.map((d) => d.code);
    expect(codes).toContain("S83.91XA"); // right knee sprain, initial encounter
    expect(codes).toContain("M25.561"); // pain in right knee
    expect(codes).not.toContain("S83.92XA"); // left knee NOT generated
    expect(res.imagingSelected).toContain("lower-knee-R"); // 73562 right knee order
    expect(res.imagingSelected).not.toContain("lower-knee-L");
    expect(res.modalities).toEqual(expect.arrayContaining(["97110", "97140"]));
    expect(res.hpiSeed).toContain("right knee: pain 6/10 — worse with stairs");
  });

  it("bilateral shoulder generates both sides; spine regions are unsided", () => {
    const f = emptyForm();
    f.complaints = [
      { region: "shoulder", side: "B", pain: "5", note: "" },
      { region: "cervical", side: "", pain: "7", note: "radiates to occiput" },
    ];
    const res = buildCascade(f);
    const codes = res.extraCodes.map((d) => d.code);
    expect(codes).toEqual(expect.arrayContaining(["S43.401A", "S43.402A", "M25.511", "M25.512", "S13.4XXA", "S16.1XXA", "M54.2"]));
    expect(res.imagingSelected).toEqual(expect.arrayContaining(["upper-shoulder-R", "upper-shoulder-L", "spine-cervical"]));
  });

  it("a region without a complaint produces nothing; head produces dx but no film", () => {
    const f = emptyForm();
    f.complaints = [{ region: "head", side: "", pain: "4", note: "" }];
    const res = buildCascade(f);
    expect(res.extraCodes.map((d) => d.code)).toEqual(["G44.319"]);
    expect(res.imagingSelected).toEqual([]); // no skull films per spec
  });

  it("merges with existing selections and is idempotent (running twice adds nothing)", () => {
    const f = emptyForm();
    f.imaging.selected = ["spine-lumbar"]; // physician already ordered lumbar
    f.plan.modalities = ["97012"]; // and traction
    f.complaints = [{ region: "knee", side: "L", pain: "8", note: "" }];
    const once = buildCascade(f);
    expect(once.imagingSelected).toEqual(expect.arrayContaining(["spine-lumbar", "lower-knee-L"]));
    expect(once.modalities).toEqual(expect.arrayContaining(["97012", "97110", "97140"]));
    // apply and re-run
    f.imaging.selected = once.imagingSelected;
    f.plan.modalities = once.modalities;
    f.assessment.extraCodes = once.extraCodes;
    const twice = buildCascade(f);
    expect(twice.imagingSelected.length).toBe(once.imagingSelected.length);
    expect(twice.extraCodes.length).toBe(once.extraCodes.length);
  });

  it("chief complaints print on the note and derived codes reach the diagnosis list", () => {
    const f = emptyForm();
    f.patient.firstName = "Test";
    f.patient.lastName = "Patient";
    f.complaints = [{ region: "knee", side: "R", pain: "6", note: "" }];
    const res = buildCascade(f);
    f.assessment.extraCodes = res.extraCodes;
    const html = buildClinicalNoteHtml(f);
    expect(html).toContain("Chief Complaints");
    expect(html).toContain("right knee pain (6/10)");
    expect(html).toContain("S83.91XA");
  });
});
