import { describe, expect, it } from "vitest";
import { estimateDegrees, impairedSides, ROM_REGIONS } from "../lib/rom";

describe("ROM catalog", () => {
  it("matches the spec movement counts", () => {
    const counts = Object.fromEntries(ROM_REGIONS.map((r) => [r.id, r.movements.length]));
    expect(counts).toEqual({
      cervical: 6,
      thoracic: 2,
      lumbar: 4,
      shoulder: 6,
      elbow: 4,
      wrist: 4,
      hand: 4,
      hip: 4,
      knee: 4,
      ankle: 8, // 6 named tests, roll in/out are separate movements per side
    });
  });
});

describe("estimateDegrees", () => {
  const cervicalFlex = ROM_REGIONS[0].movements[0];
  it("maps grades to AAOS degree estimates", () => {
    expect(estimateDegrees(cervicalFlex, "full")).toBe(50);
    expect(estimateDegrees(cervicalFlex, "partial")).toBe(33);
    expect(estimateDegrees(cervicalFlex, "limited")).toBe(18);
    expect(estimateDegrees(cervicalFlex, "cannot")).toBe(5);
    expect(estimateDegrees(cervicalFlex, "")).toBeNull();
  });
});

describe("impairedSides", () => {
  it("detects affected limb sides", () => {
    expect(impairedSides("shoulder", { "shoulder-raise-R": "limited" })).toEqual(["R"]);
    expect(impairedSides("cervical", { "cervical-flex": "limited" })).toEqual([null]);
    expect(impairedSides("ankle", {})).toEqual([]);
  });
});
