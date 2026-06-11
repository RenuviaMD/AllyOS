import { z } from "zod";

/**
 * Zod contract for a formulary Prescribing Card's YAML frontmatter.
 * The importer validates every _research/formulary/*.md file against this, so a
 * malformed card fails the build instead of reaching the Protocol Designer.
 */

export const axisEnum = z.enum([
  "Longevity",
  "Growth",
  "Metabolism",
  "Repair",
  "Cognition",
  "Immunity",
  "Vitality",
]);

export const statusEnum = z.enum([
  "fda_approved",
  "off_label",
  "investigational",
  "not_approved",
]);

const priceTier = z.object({
  usd: z.number().nonnegative(),
  duration_weeks: z.number().positive(),
  cogs_usd: z.number().nonnegative(),
});

export const popupSummarySchema = z.object({
  mechanism: z.string().min(1),
  primary_use: z.string().min(1),
  contraindications_short: z.string().min(1),
  clinical_notes_short: z.string().min(1),
});

export const formularyFrontmatterSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  name: z.string().min(1),
  brand_names: z.array(z.string()).default([]),
  axis: axisEnum,
  status: statusEnum,
  controlled: z.boolean(),
  pricing: z.object({ trial: priceTier, full: priceTier }),
  popup_summary: popupSummarySchema,
  document_meta: z.object({
    author: z.string().min(1),
    version: z.string().min(1),
    last_clinical_review: z.string().min(1),
  }),
});

export type FormularyFrontmatter = z.infer<typeof formularyFrontmatterSchema>;

export type FormularyKind = "individual" | "stack";

export interface FormularyCard extends FormularyFrontmatter {
  kind: FormularyKind;
  body: string;
}
