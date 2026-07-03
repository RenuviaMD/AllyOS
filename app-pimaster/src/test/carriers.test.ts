import { describe, expect, it } from "vitest";
import { CARRIER_SEED } from "../lib/carriers";
import { buildCms1500Html, buildSuperbillHtml } from "../lib/report";
import { emptyForm } from "../lib/types";
import type { BillingSettings } from "../lib/billing";

const settings: BillingSettings = { ein: "81-1815031", billingNpi: "", renderingNpi: "1447295126", fees: {} };

describe("carrier reference seed", () => {
  it("carries the FL PIP carriers with unique names and preserved verification notes", () => {
    expect(CARRIER_SEED.length).toBeGreaterThanOrEqual(11);
    expect(new Set(CARRIER_SEED.map((c) => c.name)).size).toBe(CARRIER_SEED.length);
    const stateFarm = CARRIER_SEED.find((c) => c.name === "State Farm");
    expect(stateFarm?.claimsAddress).toContain("P.O. Box 106134");
    // unverified carriers have a BLANK address (staff fills the claim-specific
    // one) with the caution moved to the note — never a fabricated address.
    const allstate = CARRIER_SEED.find((c) => c.name === "Allstate");
    expect(allstate?.claimsAddress).toBe("");
    expect(allstate?.notes.toLowerCase()).toContain("nj");
    // carriers with a real verified address keep it
    expect(CARRIER_SEED.find((c) => c.name === "USAA")?.claimsAddress).toContain("Pensacola");
  });
});

describe("carrier data flows onto the claim", () => {
  it("prints the submit-to carrier line and payer ID on the CMS-1500 when set", () => {
    const f = emptyForm();
    f.plan.emLevel = "99204";
    f.patient.insuranceCarrier = "State Farm";
    f.patient.insurerAddress = "State Farm Claims, P.O. Box 106134, Atlanta, GA 30348-6134";
    f.patient.insurerPhone = "800-782-8332";
    f.patient.insurerPayerId = "SF123";
    const html = buildCms1500Html(f, [], settings);
    expect(html).toContain("Submit claim to");
    expect(html).toContain("P.O. Box 106134");
    expect(html).toContain("SF123");
  });

  it("omits the carrier line entirely when no carrier data is present (blank stays blank)", () => {
    const f = emptyForm();
    expect(buildCms1500Html(f, [], settings)).not.toContain("Submit claim to");
    expect(buildSuperbillHtml(f, [], settings, "md")).not.toContain("Submit claim to");
  });
});
