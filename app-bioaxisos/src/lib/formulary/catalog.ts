import type { FormularyCard, FormularyFrontmatter, FormularyKind } from "./schema";

/**
 * Client-safe projection of a formulary card for the Protocol Designer.
 * Drops the long markdown body (the popup uses popup_summary, spec §4.5) so the
 * catalog stays small when serialized to the client.
 */
export type CatalogItem = Omit<FormularyFrontmatter, never> & { kind: FormularyKind };

export function toCatalogItem(card: FormularyCard): CatalogItem {
  const { body: _body, ...rest } = card;
  return rest;
}

export function toCatalog(cards: FormularyCard[]): CatalogItem[] {
  return cards.map(toCatalogItem);
}
