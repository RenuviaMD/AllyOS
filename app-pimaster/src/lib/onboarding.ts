import { CARRIER_SEED } from "./carriers";
import { ADVANCED_IMAGING, PROCEDURES, xrayFeeItems } from "./cpt";
import { supabase } from "./store";

/**
 * New-clinic onboarding (platform admin only — RLS enforces it).
 * Creates the clinic record, its settings row, and seeds the default
 * ICD-10 / CPT catalogs so the clinic is workable on day one.
 */

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "clinic"
  );
}

export interface NewClinicInput {
  name: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  providerName: string;
  providerLicense: string;
  providerNpi: string;
  ein: string;
  billingNpi: string;
  imagingMode: "third_party" | "onsite";
  dxCenterName: string;
  dxCenterAddress: string;
  dxCenterPhone: string;
  dxCenterFax: string;
}

export function emptyClinicInput(): NewClinicInput {
  return {
    name: "",
    address: "",
    phone: "",
    fax: "",
    email: "",
    providerName: "",
    providerLicense: "",
    providerNpi: "",
    ein: "",
    billingNpi: "",
    imagingMode: "third_party",
    dxCenterName: "",
    dxCenterAddress: "",
    dxCenterPhone: "",
    dxCenterFax: "",
  };
}

/** Default catalog template every new clinic starts from (same verified set Wellness uses). */
export const DX_SEED: { code: string; description: string; region: string | null; kind: string }[] = [
  { code: "M54.12", description: "Radiculopathy, cervical region", region: "cervical", kind: "other" },
  { code: "S13.8XXA", description: "Sprain of joints and ligaments of other parts of neck, initial encounter", region: "cervical", kind: "sprain" },
  { code: "M53.0", description: "Cervicocranial syndrome", region: "cervical", kind: "other" },
  { code: "M53.1", description: "Cervicobrachial syndrome", region: "cervical", kind: "other" },
  { code: "M99.01", description: "Segmental and somatic dysfunction of cervical region", region: "cervical", kind: "other" },
  { code: "G44.319", description: "Acute post-traumatic headache, not intractable", region: "cervical", kind: "other" },
  { code: "M54.14", description: "Radiculopathy, thoracic region", region: "thoracic", kind: "other" },
  { code: "M99.02", description: "Segmental and somatic dysfunction of thoracic region", region: "thoracic", kind: "other" },
  { code: "M54.16", description: "Radiculopathy, lumbar region", region: "lumbar", kind: "other" },
  { code: "M54.41", description: "Lumbago with sciatica, right side", region: "lumbar", kind: "other" },
  { code: "M54.42", description: "Lumbago with sciatica, left side", region: "lumbar", kind: "other" },
  { code: "S33.6XXA", description: "Sprain of sacroiliac joint, initial encounter", region: "lumbar", kind: "sprain" },
  { code: "M99.03", description: "Segmental and somatic dysfunction of lumbar region", region: "lumbar", kind: "other" },
  { code: "M62.830", description: "Muscle spasm of back", region: "lumbar", kind: "other" },
  { code: "M62.838", description: "Other muscle spasm", region: "cervical", kind: "other" },
];

export const SERVICE_SEED: { cpt: string; name: string; category: string }[] = [
  { cpt: "99205", name: "New patient, high complexity", category: "em" },
  { cpt: "99204", name: "New patient, moderate complexity", category: "em" },
  { cpt: "99214", name: "Established patient, moderate complexity", category: "em" },
  { cpt: "99215", name: "Established patient, high complexity", category: "em" },
  { cpt: "97010", name: "Hot/Cold Pack", category: "pt" },
  { cpt: "97035", name: "Ultrasound", category: "pt" },
  { cpt: "97110", name: "Therapeutic Exercise", category: "pt" },
  { cpt: "97140", name: "Manual Therapy", category: "pt" },
  { cpt: "97530", name: "Therapeutic Activities", category: "pt" },
  { cpt: "97012", name: "Mechanical Traction", category: "pt" },
  { cpt: "97014", name: "E-Stim Unattended", category: "pt" },
  { cpt: "97018", name: "Paraffin Bath", category: "pt" },
  { cpt: "97032", name: "E-Stim Attended", category: "pt" },
  { cpt: "97112", name: "Neuromuscular Re-education", category: "pt" },
  { cpt: "97116", name: "Gait Training", category: "pt" },
  // MD-performed in-office procedures.
  ...PROCEDURES.map((p) => ({ cpt: p.cpt, name: p.name, category: "other" })),
  // Imaging — priced only by clinics that perform imaging on-site; third-party centers bill their own studies.
  ...xrayFeeItems().map((x) => ({ cpt: x.cpt, name: x.name, category: "imaging" })),
  ...ADVANCED_IMAGING.map((a) => ({ cpt: a.cpt, name: a.name, category: "imaging" })),
];

export function validateClinicInput(c: NewClinicInput): string[] {
  const problems: string[] = [];
  if (!c.name.trim()) problems.push("Clinic name is required.");
  if (!c.address.trim()) problems.push("Clinic address is required (prints on every letterhead).");
  if (!c.providerName.trim()) problems.push("Rendering provider name is required (signs every note).");
  if (!c.providerNpi.trim()) problems.push("Provider NPI is required (CMS-1500 Box 24J).");
  if (c.imagingMode === "third_party" && !c.dxCenterName.trim())
    problems.push("Third-party imaging selected — enter the diagnostic center name (or choose on-site).");
  return problems;
}

export async function createClinic(input: NewClinicInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const id = slugify(input.name);
    const { error: cErr } = await supabase().from("clinics").insert({
      id,
      name: input.name.trim().toUpperCase(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      fax: input.fax.trim(),
      email: input.email.trim(),
      provider_name: input.providerName.trim(),
      provider_license: input.providerLicense.trim(),
      provider_npi: input.providerNpi.trim(),
    });
    if (cErr) throw cErr;

    const { error: sErr } = await supabase().from("clinic_settings").insert({
      clinic_id: id,
      ein: input.ein.trim() || null,
      billing_npi: input.billingNpi.trim() || null,
      rendering_npi: input.providerNpi.trim() || null,
      imaging_mode: input.imagingMode,
      dx_center_name: input.imagingMode === "third_party" ? input.dxCenterName.trim() : null,
      dx_center_address: input.imagingMode === "third_party" ? input.dxCenterAddress.trim() : null,
      dx_center_phone: input.imagingMode === "third_party" ? input.dxCenterPhone.trim() : null,
      dx_center_fax: input.imagingMode === "third_party" ? input.dxCenterFax.trim() : null,
    });
    if (sErr) throw sErr;

    const { error: dErr } = await supabase()
      .from("clinic_dx_catalog")
      .insert(DX_SEED.map((d) => ({ ...d, auto_derive: false, active: true, clinic_id: id })));
    if (dErr) throw dErr;

    const { error: vErr } = await supabase()
      .from("clinic_service_catalog")
      .insert(SERVICE_SEED.map((r) => ({ ...r, default_units: 1, active: true, clinic_id: id })));
    if (vErr) throw vErr;

    const { error: carErr } = await supabase()
      .from("clinic_insurance_carriers")
      .insert(
        CARRIER_SEED.map((c) => ({
          clinic_id: id,
          name: c.name,
          payer_id: c.payerId,
          claims_address: c.claimsAddress,
          billing_contact: c.billingContact,
          claims_phone: c.claimsPhone,
          notes: c.notes,
          active: true,
        })),
      );
    if (carErr) throw carErr;

    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
