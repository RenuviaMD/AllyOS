import { z } from "zod";
import { axisEnum, statusEnum } from "@/lib/formulary/schema";

/**
 * Shared Zod schemas (spec §7): the single typed contract for data that crosses
 * the network into server actions. No untyped payloads.
 */

/** One line item in a prescription — references a formulary card by slug. */
export const prescriptionItemSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(["individual", "stack"]),
  /** Dose as chosen in the designer, e.g. "250 mcg SC daily". */
  dose: z.string().min(1).max(200),
  route: z.string().min(1).max(60),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  items: z.array(prescriptionItemSchema).min(1).max(8),
  /** Compliance-gate checkboxes confirmed in the popup card. */
  complianceConfirmed: z
    .object({
      consentSigned: z.literal(true),
      patientEducationDelivered: z.literal(true),
      sourcePharmacyVerified: z.literal(true),
      classGatingItemConfirmed: z.literal(true),
    })
    .strict(),
  notes: z.string().max(2000).optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const createPatientSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  mrn: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "MRN: letters, digits, dashes only")
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const submitCheckInSchema = z.object({
  patientId: z.string().uuid(),
  painScore: z.number().int().min(0).max(10).optional(),
  freeText: z.string().max(4000).optional(),
});

export type SubmitCheckInInput = z.infer<typeof submitCheckInSchema>;

/** Filter state for the Protocol Designer rail. */
export const formularyFilterSchema = z.object({
  query: z.string().max(100).optional(),
  axes: z.array(axisEnum).optional(),
  statuses: z.array(statusEnum).optional(),
  kind: z.enum(["individual", "stack", "all"]).default("all"),
});

export type FormularyFilter = z.infer<typeof formularyFilterSchema>;
