/**
 * Florida PIP auto-insurance carrier reference. Admin-managed per clinic; staff
 * pick a carrier by name at intake and its claims address / phone / payer id
 * populate the CMS-1500 and give the front desk the billing contacts. Every
 * value here is exactly what was supplied — unverified addresses are marked so
 * in `notes`, never presented as confirmed (bill to the wrong box = denied claim).
 *
 * This seed is applied to every NEW clinic; the existing Wellness clinic was
 * seeded by migration `clinic_insurance_carriers`. Keep the two in sync.
 */
export interface CarrierSeed {
  name: string;
  payerId: string | null;
  claimsAddress: string;
  billingContact: string;
  claimsPhone: string;
  notes: string;
}

export const CARRIER_SEED: CarrierSeed[] = [
  {
    name: "Progressive",
    payerId: "24260 / J1748",
    claimsAddress: "Not publicly verified for paper PIP bills — use the claim-specific address from the adjuster.",
    billingContact: "MedEDI@progressive.com; attachments fax 877-213-7258; eBill AccidentEDI 800-297-6909",
    claimsPhone: "Claims 800-776-4737; service 888-671-4405",
    notes: "Progressive publishes medical eBill info, not a clear FL paper PIP address. Verify before mailing.",
  },
  {
    name: "State Farm",
    payerId: null,
    claimsAddress: "State Farm Claims, P.O. Box 106134, Atlanta, GA 30348-6134 (FL/NC/WV supporting documents).",
    billingContact: "AutoMedicalClaims@StateFarm.com; fax 844-218-1140",
    claimsPhone: "800-782-8332 (800-STATE-FARM)",
    notes: "Best verified paper/supporting-doc address for FL. Put the claim number on every page.",
  },
  {
    name: "Allstate",
    payerId: null,
    claimsAddress: "Not publicly verified for FL paper PIP bills — use the claim-specific address from the adjuster/MyClaim.",
    billingContact: "Allstate vendor/third-party carrier portal; no FL PIP paper-bill address verified publicly.",
    claimsPhone: "800-255-7828 (800-ALLSTATE)",
    notes: "Do NOT use the NJ Medlogix address for Florida — that is NJ-specific.",
  },
  {
    name: "GEICO / Berkshire Hathaway",
    payerId: null,
    claimsAddress: "Not publicly verified from GEICO official FL PIP page — use the claim-specific Auto-PIP address from the adjuster/portal.",
    billingContact: "GEICO Medical Provider Claim Tracking portal",
    claimsPhone: "800-841-3000",
    notes: "A FL attorney site lists P.O. Box 9091, Macon, GA 31208 for FL injury/PIP; verify before use (not the primary official source).",
  },
  {
    name: "USAA",
    payerId: null,
    claimsAddress: "P.O. Box 12750, Pensacola, FL 32591-2750 (provider portal).",
    billingContact: "Provider portal phone 877-838-7830",
    claimsPhone: "800-531-8722 (800-531-USAA); third-party fax 800-531-8669",
    notes: "Verified provider contact; confirm if the specific PIP claim uses another handling unit.",
  },
  {
    name: "Travelers",
    payerId: null,
    claimsAddress: "Not publicly verified for FL PIP medical bills — use the claim-specific address/upload portal.",
    billingContact: "Travelers Claim Center — file upload & claim-status tools",
    claimsPhone: "888-564-5043; directory 800-328-2189",
    notes: "Public site emphasizes claim portal/upload, not a general FL PIP paper-billing address.",
  },
  {
    name: "Auto-Owners",
    payerId: null,
    claimsAddress: "Not publicly verified for FL PIP paper bills — use the local agent/claim branch or claim-specific address.",
    billingContact: "Medical provider billing inquiry 833-255-9863 option 3",
    claimsPhone: "888-252-4626",
    notes: "Routes heavily through independent agents/claim offices; verify the case-specific address.",
  },
  {
    name: "Kemper / Infinity",
    payerId: null,
    claimsAddress: "Kemper Claims, 123 Town Square Place, PMB 785, Jersey City, NJ 07310.",
    billingContact: "mail.claims@kemper.com; fax 888-976-2123",
    claimsPhone: "800-353-6737",
    notes: "Verified Kemper claims address; confirm if an Infinity/Kemper Specialty claim uses a different unit.",
  },
  {
    name: "Ocean Harbor / Pearl Holding",
    payerId: null,
    claimsAddress: "Pearl Holding, P.O. Box 452799, Sunrise, FL 33345; email claimmaterials@pearlholding.com",
    billingContact: "Pearl claims fax 954-905-2005",
    claimsPhone: "Verify via policy/administrator",
    notes: "Pearl appears to administer Ocean Harbor auto claims. Verify before PIP mailing.",
  },
  {
    name: "National General / Direct Auto",
    payerId: null,
    claimsAddress: "Direct Auto PIP Department, P.O. Box 2989, Clinton, IA 52733 (medical providers).",
    billingContact: "Direct Auto claims fax 800-924-0273",
    claimsPhone: "Direct Auto 800-403-1077; National General 800-468-3466",
    notes: "Direct Auto has the clearest published medical-provider PIP address. National General/Allstate group addresses may differ by underwriting company.",
  },
  {
    name: "Sentry / Dairyland",
    payerId: null,
    claimsAddress: "Not publicly verified for FL PIP medical bills. Corporate ref: Sentry Insurance, 1800 North Point Drive, Stevens Point, WI 54481.",
    billingContact: "Sentry medical provider support 800-473-6879; Dairyland auto claims 800-334-0090",
    claimsPhone: "Dairyland 800-334-0090",
    notes: "Use the claim-specific address before paper billing. Dairyland is within the Sentry group.",
  },
];
