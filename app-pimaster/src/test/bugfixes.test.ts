import { describe, expect, it } from "vitest";
import { normalizeMoney, parseMoney, buildServiceLines, totalCharges, type BillingSettings } from "../lib/billing";
import { allCptCodes, allDiagnosisCodes, sanitizeHtml } from "../lib/report";
import { narrativeFingerprint, ngramJaccard } from "../lib/similarity";
import { buildEncountersCsv, type EncounterExport } from "../lib/governance";
import { medicalNecessityTemplate } from "../lib/narratives";
import { emptyForm } from "../lib/types";

describe("money parsing (Box 28 == line charges)", () => {
  it("handles $ and thousands commas; rejects garbage", () => {
    expect(parseMoney("1,200.00")).toBe(1200);
    expect(parseMoney("$150")).toBe(150);
    expect(parseMoney("150")).toBe(150);
    expect(parseMoney("abc")).toBeNull();
    expect(normalizeMoney("1,200")).toBe("1200.00");
    expect(normalizeMoney("bad")).toBe("");
  });

  it("total agrees with normalized line charges", () => {
    const settings: BillingSettings = { ein: "", billingNpi: "", renderingNpi: "", fees: { "99204": "1,200.00" } };
    const f = emptyForm();
    f.plan.emLevel = "99204";
    const lines = buildServiceLines(f, settings, "md");
    expect(lines[0].charge).toBe("1200.00");
    expect(totalCharges(lines)).toBe("1200.00");
  });
});

describe("mode-aware CPT capture", () => {
  it("PT daily charts bill treatments provided, not planned modalities", () => {
    const f = emptyForm();
    f.plan.emLevel = "99214";
    f.plan.modalities = ["97110"];
    f.ptDaily.treatments = ["97140", "97112"];
    expect(allCptCodes(f, "ptdaily")).toEqual(["97140", "97112"]);
    expect(allCptCodes(f, "ptprogress")).toEqual([]);
    expect(allCptCodes(f)).toContain("99214"); // MD note unchanged
  });
});

describe("physician code removals persist", () => {
  it("suppressed codes never re-derive onto documents", () => {
    const f = emptyForm();
    f.romExam = { "cervical-flex": "limited" };
    const before = allDiagnosisCodes(f).map((d) => d.code);
    expect(before).toContain("M54.2");
    f.assessment.suppressedCodes = ["M54.2"];
    f.assessment.autoCodes = []; // simulate "removed all shown codes"
    const after = allDiagnosisCodes(f).map((d) => d.code);
    expect(after).not.toContain("M54.2");
  });
});

describe("clone guard fingerprint = physician text only", () => {
  it("same-accident co-occupants with only the template do not collide", () => {
    const a = emptyForm();
    const b = emptyForm();
    a.plan.medicalNecessity = medicalNecessityTemplate("initial");
    b.plan.medicalNecessity = medicalNecessityTemplate("initial");
    expect(narrativeFingerprint(a)).toBe("");
    expect(ngramJaccard(narrativeFingerprint(a), narrativeFingerprint(b))).toBe(0);
  });

  it("distinct physician narratives are still compared", () => {
    const a = emptyForm();
    const b = emptyForm();
    a.plan.medicalNecessity = medicalNecessityTemplate("initial") + "Patient reports severe left knee locking and instability.";
    b.plan.medicalNecessity = medicalNecessityTemplate("initial") + "Patient reports severe left knee locking and instability.";
    expect(ngramJaccard(narrativeFingerprint(a), narrativeFingerprint(b))).toBeGreaterThan(0.2);
  });
});

describe("stored-XSS sanitizer", () => {
  it("strips scripts, event handlers, and javascript: urls but keeps report markup", () => {
    const dirty = `<style>.x{color:red}</style><h1>NOTE</h1><script>steal()</script><img src=x onerror="steal()"><a href="javascript:steal()">x</a>`;
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("<h1>NOTE</h1>");
    expect(clean).toContain(".x{color:red}");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toMatch(/href="javascript:/);
  });
});

describe("CSV formula-injection guard", () => {
  it("prefixes leading = + - @ so spreadsheets don't execute manual codes", () => {
    const row: EncounterExport = {
      chartId: "abc",
      dos: "2026-06-01",
      initials: "T.P.",
      visitType: "initial",
      modality: "In-Person",
      telehealth: false,
      icd: ["=HYPERLINK(1)"],
      cpt: ["99204"],
      chargeTotal: "",
      deficiencies: 0,
      riskStatus: "PASS",
      riskFlags: [],
    };
    const csv = buildEncountersCsv([row]);
    expect(csv).toContain("'=HYPERLINK(1)"); // neutralized with a leading apostrophe
  });
});
