import { describe, expect, it } from "vitest";
import { deriveIcd10, parseManualCodes } from "../lib/icd10";
import type { RomExam } from "../lib/types";

describe("deriveIcd10", () => {
  it("returns nothing for full ROM", () => {
    const rom: RomExam = { "cervical-flex": "full", "shoulder-raise-R": "full" };
    expect(deriveIcd10(rom)).toEqual([]);
  });

  it("maps cervical impairment to midline sprain + cervicalgia", () => {
    const rom: RomExam = { "cervical-flex": "limited" };
    const codes = deriveIcd10(rom).map((d) => d.code);
    expect(codes).toContain("S13.4XXA");
    expect(codes).toContain("M54.2");
  });

  it("maps right shoulder impairment to right-sided codes only", () => {
    const rom: RomExam = { "shoulder-raise-R": "partial", "shoulder-raise-L": "full" };
    const codes = deriveIcd10(rom).map((d) => d.code);
    expect(codes).toContain("S43.401A");
    expect(codes).toContain("M25.511");
    expect(codes).not.toContain("S43.402A");
  });

  it("maps bilateral knee impairment to both sides", () => {
    const rom: RomExam = { "knee-chair-R": "cannot", "knee-stepup-L": "limited" };
    const codes = deriveIcd10(rom).map((d) => d.code);
    expect(codes).toEqual(expect.arrayContaining(["S83.91XA", "S83.92XA", "M25.561", "M25.562"]));
  });

  it("does not duplicate codes when multiple movements in a region are impaired", () => {
    const rom: RomExam = { "lumbar-flex": "limited", "lumbar-ext": "cannot" };
    const codes = deriveIcd10(rom).map((d) => d.code);
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
