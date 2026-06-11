import { describe, expect, it } from "vitest";
import { filterFormulary } from "@/lib/formulary/filter";
import { loadFormulary } from "@/lib/formulary";

const cards = loadFormulary();

describe("filterFormulary", () => {
  it("returns all cards with an empty filter", () => {
    expect(filterFormulary(cards, { kind: "all" })).toHaveLength(cards.length);
  });

  it("filters by kind", () => {
    expect(filterFormulary(cards, { kind: "stack" }).every((c) => c.kind === "stack")).toBe(true);
    expect(filterFormulary(cards, { kind: "individual" })).toHaveLength(22);
  });

  it("filters by axis", () => {
    const repair = filterFormulary(cards, { kind: "all", axes: ["Repair"] });
    expect(repair.every((c) => c.axis === "Repair")).toBe(true);
    expect(repair.length).toBeGreaterThan(0);
  });

  it("filters by status", () => {
    const approved = filterFormulary(cards, { kind: "all", statuses: ["fda_approved"] });
    expect(approved.map((c) => c.slug).sort()).toEqual(["pt-141", "tesamorelin", "tirzepatide"]);
  });

  it("searches name, slug, brand, and mechanism", () => {
    expect(filterFormulary(cards, { kind: "all", query: "mounjaro" }).map((c) => c.slug)).toContain(
      "tirzepatide",
    );
    expect(filterFormulary(cards, { kind: "all", query: "ghrh" }).length).toBeGreaterThan(0);
  });

  it("combines filters (AND)", () => {
    const out = filterFormulary(cards, {
      kind: "individual",
      axes: ["Growth"],
      statuses: ["fda_approved"],
    });
    expect(out.map((c) => c.slug)).toEqual(["tesamorelin"]);
  });
});
