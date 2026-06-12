import { describe, expect, it } from "vitest";
import { buildFacilityReportHtml, complianceFlags, expiryStatus, REGISTRIES } from "../lib/facility";

const today = new Date("2026-06-12T00:00:00Z");

describe("expiryStatus", () => {
  it("classifies expired, expiring (60d), ok, and missing dates", () => {
    expect(expiryStatus("2026-06-01", today)).toBe("EXPIRED");
    expect(expiryStatus("2026-07-15", today)).toBe("EXPIRING");
    expect(expiryStatus("2027-06-12", today)).toBe("OK");
    expect(expiryStatus(null, today)).toBe("MISSING");
    expect(expiryStatus("", today)).toBe("MISSING");
  });
});

describe("complianceFlags", () => {
  it("flags unverified licenses, missing L2, expired BAAs, overdue calibration, unreported incidents, unreviewed contracts", () => {
    const flags = complianceFlags(
      {
        facility_practitioners: [
          { name: "Dr. A", active: true, license_expiration: "2027-01-01", license_verified: false, l2_screening: false },
        ],
        facility_vendors: [{ organization_name: "Lab X", baa_signed: true, baa_expiration: "2026-01-01", anti_kickback_reviewed: false }],
        facility_equipment: [{ name: "X-Ray Unit", next_calibration_due: "2026-05-01" }],
        facility_incidents: [{ incident_number: "INC-1", status: "open", reported_to_airs: false }],
        facility_referral_contracts: [{ referring_entity: "Firm Y", md_reviewed: false }],
      },
      today,
    );
    expect(flags.some((f) => f.includes("not verified against DOH"))).toBe(true);
    expect(flags.some((f) => f.includes("Level-2 screening"))).toBe(true);
    expect(flags.some((f) => f.includes("BAA expired"))).toBe(true);
    expect(flags.some((f) => f.includes("calibration OVERDUE"))).toBe(true);
    expect(flags.some((f) => f.includes("not yet reported to AIRS"))).toBe(true);
    expect(flags.some((f) => f.includes("MD review pending"))).toBe(true);
  });

  it("raises no flags for a clean registry", () => {
    const flags = complianceFlags(
      {
        facility_practitioners: [
          { name: "Dr. A", active: true, license_expiration: "2027-12-01", license_verified: true, l2_screening: true, discipline_on_file: false },
        ],
        facility_vendors: [
          { organization_name: "Lab X", baa_signed: true, baa_expiration: "2027-12-01", anti_kickback_reviewed: true },
        ],
        facility_equipment: [{ name: "X-Ray Unit", next_calibration_due: "2027-12-01" }],
        facility_incidents: [{ incident_number: "INC-1", status: "closed", reported_to_airs: true }],
        facility_referral_contracts: [{ referring_entity: "Firm Y", md_reviewed: true, expiration_date: "2027-12-01" }],
      },
      today,
    );
    expect(flags).toEqual([]);
  });
});

describe("buildFacilityReportHtml", () => {
  it("covers all five registries, the AHCA license, and the no-PHI statement", () => {
    const html = buildFacilityReportHtml({
      data: { facility_practitioners: [{ name: "Dr. A", license_verified: true, l2_screening: true, active: true, license_expiration: "2027-12-01" }] },
      reviewer: "Dr. Armando Falcon, MD",
      ahcaLicense: "HCC-12345",
      ahcaLicenseExpiration: "2027-01-31",
    });
    expect(html).toContain("FACILITY COMPLIANCE REGISTRY");
    expect(html).toContain("HCC-12345");
    expect(html).toContain("400.9935");
    expect(html).toContain("no protected health information");
    for (const reg of REGISTRIES) expect(html).toContain(reg.label);
  });
});
