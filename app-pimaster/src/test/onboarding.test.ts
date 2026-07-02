import { describe, expect, it } from "vitest";
import { DX_SEED, emptyClinicInput, SERVICE_SEED, slugify, validateClinicInput } from "../lib/onboarding";

describe("slugify", () => {
  it("builds a stable clinic id from the legal name", () => {
    expect(slugify("Sunshine Injury & Rehab, LLC")).toBe("sunshine_injury_rehab_llc");
    expect(slugify("  WELLNESS HEALTHCARE CLINIC CORP ")).toBe("wellness_healthcare_clinic_corp");
    expect(slugify("!!!")).toBe("clinic");
  });
});

describe("validateClinicInput", () => {
  it("requires name, address, provider name and NPI", () => {
    const problems = validateClinicInput(emptyClinicInput());
    expect(problems.join(" ")).toContain("Clinic name");
    expect(problems.join(" ")).toContain("address");
    expect(problems.join(" ")).toContain("provider name");
    expect(problems.join(" ")).toContain("NPI");
  });

  it("requires a diagnostic center when third-party imaging is selected, not for on-site", () => {
    const c = { ...emptyClinicInput(), name: "X Clinic", address: "1 Main St", providerName: "Dr. A", providerNpi: "1234567890" };
    expect(validateClinicInput({ ...c, imagingMode: "third_party" }).join(" ")).toContain("diagnostic center");
    expect(validateClinicInput({ ...c, imagingMode: "onsite" })).toEqual([]);
  });
});

describe("catalog seed template", () => {
  it("seeds the verified default catalogs for every new clinic", () => {
    expect(DX_SEED.length).toBeGreaterThanOrEqual(15);
    expect(SERVICE_SEED.map((s) => s.cpt)).toEqual(expect.arrayContaining(["99204", "97110", "97112", "97116"]));
    // no duplicates
    expect(new Set(DX_SEED.map((d) => d.code)).size).toBe(DX_SEED.length);
    expect(new Set(SERVICE_SEED.map((s) => s.cpt)).size).toBe(SERVICE_SEED.length);
  });
});
