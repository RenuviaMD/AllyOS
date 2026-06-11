import { describe, expect, it } from "vitest";
import { createPrescriptionSchema, submitCheckInSchema } from "@/lib/schemas";

const uuid = "11111111-1111-1111-1111-111111111111";

describe("createPrescriptionSchema", () => {
  const valid = {
    patientId: uuid,
    items: [{ slug: "bpc-157", kind: "individual", dose: "250 mcg SC daily", route: "SC" }],
    complianceConfirmed: {
      consentSigned: true,
      patientEducationDelivered: true,
      sourcePharmacyVerified: true,
      classGatingItemConfirmed: true,
    },
  };

  it("accepts a fully gated prescription", () => {
    expect(createPrescriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects when a compliance box is not confirmed", () => {
    const bad = {
      ...valid,
      complianceConfirmed: { ...valid.complianceConfirmed, consentSigned: false },
    };
    expect(createPrescriptionSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty item list", () => {
    expect(createPrescriptionSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it("rejects a non-kebab slug", () => {
    const bad = { ...valid, items: [{ ...valid.items[0], slug: "BPC_157" }] };
    expect(createPrescriptionSchema.safeParse(bad).success).toBe(false);
  });
});

describe("submitCheckInSchema", () => {
  it("accepts a pain score in range", () => {
    expect(submitCheckInSchema.safeParse({ patientId: uuid, painScore: 7 }).success).toBe(true);
  });
  it("rejects an out-of-range pain score", () => {
    expect(submitCheckInSchema.safeParse({ patientId: uuid, painScore: 11 }).success).toBe(false);
  });
});
