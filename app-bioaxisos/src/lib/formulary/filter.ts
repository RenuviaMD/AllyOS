import type { FormularyFilter } from "@/lib/schemas";
import type { FormularyCard, FormularyFrontmatter, FormularyKind } from "./schema";

/** Minimal shape needed to filter — satisfied by both FormularyCard and CatalogItem. */
type Filterable = Pick<
  FormularyFrontmatter,
  "name" | "slug" | "brand_names" | "axis" | "status" | "popup_summary"
> & { kind: FormularyKind };

/**
 * Pure filtering for the Protocol Designer formulary grid. Kept side-effect free
 * so it is unit-testable and can run on the server (against loadFormulary()) or
 * be reused client-side over a serialized catalog.
 */
export function filterFormulary<T extends Filterable>(cards: T[], filter: FormularyFilter): T[] {
  const q = filter.query?.trim().toLowerCase();
  return cards.filter((card) => {
    if (filter.kind && filter.kind !== "all" && card.kind !== filter.kind) return false;
    if (filter.axes && filter.axes.length > 0 && !filter.axes.includes(card.axis)) return false;
    if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(card.status)) {
      return false;
    }
    if (q) {
      const haystack = [
        card.name,
        card.slug,
        ...card.brand_names,
        card.popup_summary.mechanism,
        card.popup_summary.primary_use,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Group a catalog by axis for the rail counts. */
export function countByAxis(cards: Array<Pick<FormularyCard, "axis">>): Record<string, number> {
  return cards.reduce<Record<string, number>>((acc, c) => {
    acc[c.axis] = (acc[c.axis] ?? 0) + 1;
    return acc;
  }, {});
}
