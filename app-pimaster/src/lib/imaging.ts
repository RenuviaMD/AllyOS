import { CLINIC, DIAGNOSTIC_CENTER } from "./clinic";

/**
 * Per-clinic imaging configuration. A clinic either refers imaging to a
 * third-party diagnostic center (e.g. MAZEL for Wellness) or performs it
 * on-site. Drives the imaging-order document. Cached locally (synced from
 * clinic_settings) so the report builders can read it synchronously.
 */
export type ImagingMode = "third_party" | "onsite";

export interface ImagingConfig {
  mode: ImagingMode;
  centerName: string;
  centerAddress: string;
  centerPhone: string;
  centerFax: string;
}

const LS_KEY = "pimaster-imaging";

export function defaultImagingConfig(): ImagingConfig {
  return {
    mode: "third_party",
    centerName: DIAGNOSTIC_CENTER.name,
    centerAddress: DIAGNOSTIC_CENTER.address,
    centerPhone: DIAGNOSTIC_CENTER.phone,
    centerFax: DIAGNOSTIC_CENTER.fax,
  };
}

export function loadImagingConfig(): ImagingConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...defaultImagingConfig(), ...JSON.parse(raw) };
  } catch {
    // fall through
  }
  return defaultImagingConfig();
}

export function saveImagingConfig(c: ImagingConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}

/** Where the imaging order is addressed, given the clinic's config. */
export function imagingDestination(c: ImagingConfig): { heading: string; name: string; address: string; phone: string; fax: string } {
  if (c.mode === "onsite") {
    return {
      heading: "Performed On-Site",
      name: CLINIC.name,
      address: CLINIC.address,
      phone: CLINIC.phone,
      fax: CLINIC.fax,
    };
  }
  return {
    heading: "Referred To",
    name: c.centerName,
    address: c.centerAddress,
    phone: c.centerPhone,
    fax: c.centerFax,
  };
}
