export interface ClinicProfile {
  id: string;
  product: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  provider: string;
  license: string;
  npi: string;
}

export const DEFAULT_CLINIC: ClinicProfile = {
  id: "wellness_hcc",
  product: "PI Master™ by RenuviaMD® Network",
  name: "WELLNESS HEALTHCARE CLINIC CORP",
  address: "8180 NW 36th ST SUITE 213, DORAL, FL 33166",
  phone: "305-994-9500",
  fax: "786-441-2179",
  email: "wellnesshcc@gmail.com",
  provider: "Dr. Armando Falcon, MD",
  license: "FL ME 84789",
  npi: "1447295126",
};

/**
 * Active clinic profile. Mutable singleton so every document builder picks up
 * the signed-in clinic's letterhead without threading a parameter through
 * every call site. Set from the clinics table after sign-in / clinic switch.
 */
export const CLINIC: ClinicProfile = { ...DEFAULT_CLINIC };

export function setActiveClinic(profile: Partial<ClinicProfile> & { id: string }): void {
  Object.assign(CLINIC, DEFAULT_CLINIC, { product: DEFAULT_CLINIC.product }, profile);
}

export const DIAGNOSTIC_CENTER = {
  name: "MAZEL MEDICAL CENTER INC.",
  address: "8150 S.W. 8TH STREET SUITE 119, MIAMI, FL 33144",
  phone: "305-261-3020",
  fax: "305-261-3070",
};
