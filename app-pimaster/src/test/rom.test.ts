import { describe, expect, it } from "vitest";
import { EXAM_REGIONS, emptySpineExam, impairedSides } from "../lib/rom";

describe("exam catalog", () => {
  it("matches the specified maneuver counts per region", () => {
    const counts = Object.fromEntries(EXAM_REGIONS.map((r) => [r.id, r.maneuvers.length]));
    expect(counts).toEqual({
      cervical: 6,
      lumbar: 4,
      shoulder: 6,
      elbow: 4,
      wrist: 4,
      hip: 2,
      knee: 4,
      ankle: 6,
    });
  });

  it("every maneuver has a verbal script and a normal reference", () => {
    for (const r of EXAM_REGIONS) {
      for (const m of r.maneuvers) {
        expect(m.script.length).toBeGreaterThan(0);
        expect(m.normalLabel.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("impairedSides", () => {
  const base = { romExam: {}, spineExam: emptySpineExam(), jointTenderness: {} };

  it("detects limb sides from functional maneuvers", () => {
    expect(impairedSides("shoulder", { ...base, romExam: { "shoulder-raiseR": "limited" } })).toEqual(["R"]);
  });

  it("detects joint tenderness as impairment", () => {
    expect(
      impairedSides("knee", { ...base, jointTenderness: { knee: { R: "", L: "yes" } } }),
    ).toEqual(["L"]);
  });

  it("treats spine regions as midline from maneuvers or the spine table", () => {
    expect(impairedSides("cervical", { ...base, romExam: { "cervical-flex": "cannot" } })).toEqual([null]);
    const spineExam = emptySpineExam();
    spineExam.thoracic.spasm = "yes";
    expect(impairedSides("thoracic", { ...base, spineExam })).toEqual([null]);
  });

  it("returns nothing when all findings are WNL/absent", () => {
    const spineExam = emptySpineExam();
    spineExam.lumbar.tenderness = "no";
    spineExam.lumbar.rom = "wnl";
    expect(impairedSides("lumbar", { ...base, spineExam, romExam: { "lumbar-flex": "wnl" } })).toEqual([]);
    expect(impairedSides("ankle", base)).toEqual([]);
  });
});
