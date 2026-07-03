import { describe, expect, it } from "vitest";
import { defaultImagingConfig, imagingDestination } from "../lib/imaging";
import { CLINIC } from "../lib/clinic";

describe("imaging configuration", () => {
  it("defaults to the third-party center (MAZEL) for backward compatibility", () => {
    const c = defaultImagingConfig();
    expect(c.mode).toBe("third_party");
    expect(c.centerName).toContain("MAZEL");
  });

  it("addresses a third-party order to the configured center", () => {
    const dest = imagingDestination({
      mode: "third_party",
      centerName: "ACME IMAGING LLC",
      centerAddress: "1 Main St, Miami, FL",
      centerPhone: "305-000-0000",
      centerFax: "305-000-0001",
    });
    expect(dest.heading).toBe("Referred To");
    expect(dest.name).toBe("ACME IMAGING LLC");
    expect(dest.fax).toBe("305-000-0001");
  });

  it("addresses an on-site order to the clinic itself", () => {
    const dest = imagingDestination({ ...defaultImagingConfig(), mode: "onsite" });
    expect(dest.heading).toBe("Performed On-Site");
    expect(dest.name).toBe(CLINIC.name);
    expect(dest.address).toBe(CLINIC.address);
  });
});
