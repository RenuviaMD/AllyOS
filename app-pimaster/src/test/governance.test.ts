import { describe, expect, it } from "vitest";
import { buildGovernanceReportHtml, emptyItem, itemComplete, MAX_CHARTS, MIN_CHARTS, sampleCharts } from "../lib/governance";
import { withEncounter } from "../lib/icd10";

describe("7th-character encounter switching", () => {
  it("keeps A on initial visits and switches to D on follow-up/final", () => {
    const dx = { code: "S13.4XXA", desc: "Sprain of ligaments of cervical spine, initial encounter" };
    expect(withEncounter(dx, "initial")).toEqual(dx);
    expect(withEncounter(dx, "followup")).toEqual({
      code: "S13.4XXD",
      desc: "Sprain of ligaments of cervical spine, subsequent encounter",
    });
    expect(withEncounter(dx, "final").code).toBe("S13.4XXD");
  });

  it("never touches non-injury (M/G chapter) codes", () => {
    const dx = { code: "M54.2", desc: "Cervicalgia" };
    expect(withEncounter(dx, "followup")).toEqual(dx);
    const g = { code: "G44.319", desc: "Acute post-traumatic headache, not intractable" };
    expect(withEncounter(g, "final")).toEqual(g);
  });
});

describe("governance chart review", () => {
  const chart = { id: "r1", patient_label: "Test Patient", dos: "2026-05-04", mode: "initial", telehealth: false };

  it("enforces the 5–10 range constants", () => {
    expect(MIN_CHARTS).toBe(5);
    expect(MAX_CHARTS).toBe(10);
  });

  it("samples without exceeding the pool", () => {
    const pool = Array.from({ length: 3 }, (_, i) => ({ ...chart, id: `r${i}` }));
    expect(sampleCharts(pool, 10)).toHaveLength(3);
    expect(new Set(sampleCharts(pool, 10).map((c) => c.id)).size).toBe(3);
  });

  it("an item is complete only when a finding is recorded", () => {
    const item = emptyItem(chart);
    expect(itemComplete(item)).toBe(false);
    item.finding = "compliant";
    expect(itemComplete(item)).toBe(true);
  });

  it("telehealth charts carry the telehealth check; in-person charts do not", () => {
    expect(emptyItem(chart).telehealthCompliant).toBeNull();
    expect(emptyItem({ ...chart, telehealth: true }).telehealthCompliant).toBe(false);
  });

  it("builds a binder report citing § 400.9935 with all reviewed charts", () => {
    const item = { ...emptyItem(chart), finding: "compliant" as const, documentationComplete: true };
    const html = buildGovernanceReportHtml({
      month: "2026-05",
      targetCount: 5,
      totalChartsInMonth: 3,
      items: [item],
      reviewer: "Dr. Armando Falcon, MD",
    });
    expect(html).toContain("400.9935");
    expect(html).toContain("MEDICAL DIRECTOR MONTHLY CHART REVIEW");
    expect(html).toContain("Test Patient");
    expect(html).toContain("all available charts were reviewed");
  });
});
