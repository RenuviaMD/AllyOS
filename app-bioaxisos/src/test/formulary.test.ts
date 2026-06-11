import { describe, expect, it } from "vitest";
import { loadFormulary } from "@/lib/formulary";

/**
 * Validates the real committed formulary (../_research/formulary) against the
 * Zod schema. If a card is malformed or a slug mismatches its filename, the
 * loader throws and this fails — the same guarantee the build relies on.
 */
describe("formulary import", () => {
  const cards = loadFormulary();

  it("loads all 29 cards (22 individual + 7 stack)", () => {
    expect(cards).toHaveLength(29);
    expect(cards.filter((c) => c.kind === "individual")).toHaveLength(22);
    expect(cards.filter((c) => c.kind === "stack")).toHaveLength(7);
  });

  it("every card has a kebab-case slug matching valid frontmatter", () => {
    for (const c of cards) {
      expect(c.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(c.body.length).toBeGreaterThan(0);
      expect(c.pricing.trial.usd).toBeGreaterThan(0);
    }
  });

  it("slugs are unique", () => {
    const slugs = cards.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only approved drugs carry fda_approved status", () => {
    const approved = cards.filter((c) => c.status === "fda_approved").map((c) => c.slug);
    expect(approved.sort()).toEqual(["pt-141", "tesamorelin", "tirzepatide"]);
  });
});
