import { describe, expect, it } from "vitest";
import { billableCpts, buildServiceLines, cptCategory, posCode, totalCharges, type BillingSettings } from "../lib/billing";
import { emptyForm } from "../lib/types";

const settings: BillingSettings = { ein: "12-3456789", billingNpi: "", renderingNpi: "1447295126", fees: { "99204": "300", "97110": "55" } };

describe("posCode", () => {
  it("uses POS 11 in person and POS 02 for facility-originated telehealth (never 10)", () => {
    expect(posCode({ visitMode: "inPerson" })).toBe("11");
    expect(posCode({ visitMode: "telehealth" })).toBe("02");
  });
});

describe("buildServiceLines", () => {
  it("builds an E/M line for MD encounters with modifier 95 on telehealth", () => {
    const f = emptyForm();
    f.plan.emLevel = "99204";
    f.visitMode = "telehealth";
    const lines = buildServiceLines(f, settings, "md");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ cpt: "99204", modifier: "95", pos: "02", units: 1, charge: "300.00" });
  });

  it("builds PT treatment lines, always in person, blank charge when unpriced", () => {
    const f = emptyForm();
    f.ptDaily.treatments = ["97110", "97140"];
    const lines = buildServiceLines(f, settings, "pt");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ cpt: "97110", pos: "11", modifier: "", charge: "55.00" });
    expect(lines[1].charge).toBe("");
  });
});

describe("totalCharges", () => {
  it("totals priced lines and is blank when nothing is priced", () => {
    const f = emptyForm();
    f.ptDaily.treatments = ["97110", "97140"];
    const lines = buildServiceLines(f, settings, "pt");
    expect(totalCharges(lines)).toBe("55.00");
    expect(totalCharges(buildServiceLines(f, { ...settings, fees: {} }, "pt"))).toBe("");
  });
});

describe("billableCpts (fee schedule list)", () => {
  it("includes E/M, PT, X-ray, and MRI/CT/US codes with no duplicates", () => {
    const list = billableCpts();
    const codes = list.map((c) => c.cpt);
    expect(codes).toEqual(expect.arrayContaining(["99204", "97110", "72040", "72100", "72141", "72148", "70450", "76881"]));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("collapses X-ray body parts that share a CPT into one fee row (Sacrum/Coccyx = 72220)", () => {
    const row = billableCpts().filter((c) => c.cpt === "72220");
    expect(row).toHaveLength(1);
    expect(row[0].name).toContain("Sacrum");
    expect(row[0].name).toContain("Coccyx");
    expect(row[0].group).toBe("X-Ray");
  });

  it("categorizes CPTs for the clinic catalog", () => {
    expect(cptCategory("99205")).toBe("em");
    expect(cptCategory("97110")).toBe("pt");
    expect(cptCategory("72040")).toBe("imaging");
    expect(cptCategory("76700")).toBe("imaging");
  });
});
