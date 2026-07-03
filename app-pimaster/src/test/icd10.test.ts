import { describe, expect, it } from "vitest";
import { deriveIcd10, parseManualCodes, type ExamFindings } from "../lib/icd10";
import { emptySpineExam } from "../lib/rom";

function findings(partial: Partial<ExamFindings> = {}): ExamFindings {
  return { romExam: {}, spineExam: emptySpineExam(), jointTenderness: {}, ...partial };
}

describe("deriveIcd10", () => {
  it("returns nothing for an exam that is fully WNL", () => {
    expect(deriveIcd10(findings({ romExam: { "cervical-flex": "wnl", "shoulder-raiseR": "wnl" } }))).toEqual([]);
  });

  it("maps cervical functional limitation to midline sprain + cervicalgia", () => {
    const codes = deriveIcd10(findings({ romExam: { "cervical-flex": "limited" } })).map((d) => d.code);
    expect(codes).toContain("S13.4XXA");
    expect(codes).toContain("M54.2");
  });

  it("maps spine-table tenderness/spasm to the region's codes (no maneuver needed)", () => {
    const spineExam = emptySpineExam();
    spineExam.thoracic.spasm = "yes";
    const codes = deriveIcd10(findings({ spineExam })).map((d) => d.code);
    expect(codes).toContain("S23.3XXA");
    expect(codes).toContain("M54.6");
  });

  it("maps right shoulder limitation to right-sided codes only", () => {
    const codes = deriveIcd10(
      findings({ romExam: { "shoulder-raiseR": "limited", "shoulder-raiseL": "wnl" } }),
    ).map((d) => d.code);
    expect(codes).toContain("S43.401A");
    expect(codes).toContain("M25.511");
    expect(codes).not.toContain("S43.402A");
  });

  it("maps joint tenderness to that side's codes", () => {
    const codes = deriveIcd10(findings({ jointTenderness: { knee: { R: "yes", L: "" } } })).map((d) => d.code);
    expect(codes).toEqual(expect.arrayContaining(["S83.91XA", "M25.561"]));
    expect(codes).not.toContain("S83.92XA");
  });

  it("maps bilateral knee impairment to both sides", () => {
    const codes = deriveIcd10(
      findings({ romExam: { "knee-chairR": "cannot", "knee-stepL": "limited" } }),
    ).map((d) => d.code);
    expect(codes).toEqual(expect.arrayContaining(["S83.91XA", "S83.92XA", "M25.561", "M25.562"]));
  });

  it("does not duplicate codes when multiple findings hit one region", () => {
    const spineExam = emptySpineExam();
    spineExam.lumbar.tenderness = "yes";
    const codes = deriveIcd10(
      findings({ spineExam, romExam: { "lumbar-flex": "limited", "lumbar-ext": "cannot" } }),
    ).map((d) => d.code);
    expect(codes.filter((c) => c === "S33.5XXA")).toHaveLength(1);
  });
});

describe("parseManualCodes", () => {
  it("parses code + description lines", () => {
    expect(parseManualCodes("m99.01 Segmental dysfunction, cervical\n\n")).toEqual([
      { code: "M99.01", desc: "Segmental dysfunction, cervical" },
    ]);
  });
});
