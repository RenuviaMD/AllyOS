import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadBillingSettings, saveBillingSettings } from "./billing";
import { DEFAULT_CLINIC, setActiveClinic, type ClinicProfile } from "./clinic";
import { defaultImagingConfig, saveImagingConfig, type ImagingConfig } from "./imaging";
import type { VisitForm } from "./types";

// The publishable key ships in the client bundle by design (same model as the
// previous PI Master build). Server-side authorization is enforced by RLS.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://fkwqzmnqflmkchiszxub.supabase.co";
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "sb_publishable_q5t7wFdJfaCFzyUqkfhX7g_n-EgYJ9H";

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}

export type ReportMode =
  | "initial"
  | "followup"
  | "final"
  | "ptdaily"
  | "ptprogress"
  // visit package documents (intake/legal forms saved to the same archive)
  | "aob"
  | "records_release"
  | "attestation14"
  | "pip_regulation"
  | "excluded_services"
  | "oir_disclosure"
  | "telehealth_consent"
  | "affidavit"
  // mailed insurance billing package (cover sheet archived; status tracked in form_data)
  | "billing_package";

const PACKAGE_MODES = ["aob", "records_release", "attestation14", "pip_regulation", "excluded_services", "oir_disclosure", "telehealth_consent", "affidavit"];

// ---------- Active clinic (tenancy) ----------

const CLINIC_LS_KEY = "pimaster-clinic";

/** The clinic every read/write is scoped to. RLS enforces it server-side;
 * this keeps the platform admin's cross-clinic view coherent client-side. */
export function activeClinicId(): string {
  return localStorage.getItem(CLINIC_LS_KEY) || DEFAULT_CLINIC.id;
}

export function setActiveClinicId(id: string): void {
  localStorage.setItem(CLINIC_LS_KEY, id);
}

export interface ClinicRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  provider_name: string | null;
  provider_license: string | null;
  provider_npi: string | null;
  active: boolean;
}

export async function listClinics(): Promise<ClinicRow[]> {
  const { data, error } = await supabase().from("clinics").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as ClinicRow[];
}

/** Load the active clinic's profile into the letterhead singleton. */
export async function loadActiveClinicProfile(): Promise<void> {
  try {
    const { data } = await supabase().from("clinics").select("*").eq("id", activeClinicId()).maybeSingle();
    if (data) {
      const profile: Partial<ClinicProfile> & { id: string } = {
        id: data.id,
        name: data.name ?? DEFAULT_CLINIC.name,
        address: data.address ?? "",
        phone: data.phone ?? "",
        fax: data.fax ?? "",
        email: data.email ?? "",
        provider: data.provider_name ?? "",
        license: data.provider_license ?? "",
        npi: data.provider_npi ?? "",
      };
      setActiveClinic(profile);
    }
  } catch {
    // offline: keep current/default letterhead
  }
}

function deviceKey(): string {
  const k = "pimaster-device-key";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
}

const DRAFT_LS_KEY = "pimaster-draft";

/** Save the working draft (Supabase form_state, with localStorage fallback). */
export async function saveDraft(form: VisitForm): Promise<"cloud" | "local"> {
  localStorage.setItem(DRAFT_LS_KEY, JSON.stringify(form));
  try {
    const { error } = await supabase()
      .from("form_state")
      .upsert(
        { device_key: deviceKey(), mode: form.visitType, state_data: form, clinic_id: activeClinicId(), updated_at: new Date().toISOString() },
        { onConflict: "device_key,mode" },
      );
    if (error) throw error;
    return "cloud";
  } catch {
    return "local";
  }
}

export async function loadDraft(): Promise<VisitForm | null> {
  try {
    const { data, error } = await supabase()
      .from("form_state")
      .select("state_data, updated_at")
      .eq("device_key", deviceKey())
      .eq("clinic_id", activeClinicId())
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    if (data && data.length > 0) return data[0].state_data as VisitForm;
  } catch {
    // fall through to local
  }
  const local = localStorage.getItem(DRAFT_LS_KEY);
  return local ? (JSON.parse(local) as VisitForm) : null;
}

export interface SavedReport {
  id: string;
  mode: ReportMode;
  dos: string;
  created_at: string;
  patient_label: string;
}

export async function saveReport(args: {
  mode: ReportMode;
  dos: string;
  form: VisitForm;
  html: string;
  icdCodes: string[];
  cptCodes: string[];
  /** audit trail: similarity scores, warnings shown, audited timestamp */
  auditTrail?: object;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase().from("reports").insert({
      mode: args.mode,
      dos: args.dos,
      report_html: args.html,
      form_data: args.auditTrail ? { ...args.form, _audit: args.auditTrail } : args.form,
      icd_codes: args.icdCodes,
      cpt_codes: args.cptCodes,
      clinic_id: activeClinicId(),
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Package documents already generated for a patient (kind -> DOS). Used to
 * mark once-per-patient documents (AOB, releases, affidavit) as done so they
 * are never regenerated on later visits.
 */
export async function listPatientDocKinds(
  firstName: string,
  lastName: string,
  dob: string,
): Promise<Record<string, { dos: string; id: string }>> {
  const me = `${firstName} ${lastName}`.trim().toLowerCase();
  if (!me || !dob) return {};
  try {
    const { data, error } = await supabase()
      .from("reports")
      .select("id, mode, dos, form_data")
      .in("mode", PACKAGE_MODES)
      .eq("status", "active")
      .eq("clinic_id", activeClinicId())
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    const out: Record<string, { dos: string; id: string }> = {};
    for (const r of data ?? []) {
      const p = (r.form_data as VisitForm | null)?.patient;
      const name = `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim().toLowerCase();
      if (name === me && (p?.dob ?? "") === dob && !out[r.mode as string])
        out[r.mode as string] = { dos: r.dos as string, id: r.id as string };
    }
    return out;
  } catch {
    return {}; // offline: statuses show unknown, generation still possible
  }
}

/**
 * Notes for other patients injured in the same accident (same accident date,
 * different patient) — used by the clone guard before generating a note.
 */
export async function fetchSameAccidentForms(accidentDate: string, excludePatient: string, limit = 30): Promise<VisitForm[]> {
  if (!accidentDate) return [];
  try {
    const { data, error } = await supabase()
      .from("reports")
      .select("form_data")
      .in("mode", ["initial", "followup", "final"])
      .eq("status", "active")
      .eq("clinic_id", activeClinicId())
      .eq("form_data->accident->>accidentDate", accidentDate)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const me = excludePatient.trim().toLowerCase();
    const out: VisitForm[] = [];
    for (const row of data ?? []) {
      const f = row.form_data as VisitForm | null;
      if (!f?.accident?.accidentDate || f.accident.accidentDate !== accidentDate) continue;
      const name = `${f.patient?.firstName ?? ""} ${f.patient?.lastName ?? ""}`.trim().toLowerCase();
      if (!name || name === me) continue;
      out.push(f);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return []; // offline: clone guard degrades to a warning in the UI
  }
}

export interface DayReport {
  id: string;
  mode: ReportMode;
  dos: string;
  created_at: string;
  form: Partial<VisitForm> | null;
}

/** Every active report with DOS = `dos` — feeds the Today's Visits landing (U1). */
export async function listReportsForDay(dos: string): Promise<DayReport[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, created_at, form_data")
    .eq("status", "active")
    .eq("clinic_id", activeClinicId())
    .eq("dos", dos)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    mode: r.mode as ReportMode,
    dos: r.dos as string,
    created_at: r.created_at as string,
    form: (r.form_data as Partial<VisitForm>) ?? null,
  }));
}

/** All archived package documents (intake/legal forms) — the staff landing groups them per patient for packet status. */
export async function listPackageDocReports(): Promise<DayReport[]> {
  try {
    const { data, error } = await supabase()
      .from("reports")
      .select("id, mode, dos, created_at, form_data")
      .in("mode", PACKAGE_MODES)
      .eq("status", "active")
      .eq("clinic_id", activeClinicId())
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      mode: r.mode as ReportMode,
      dos: r.dos as string,
      created_at: r.created_at as string,
      form: (r.form_data as Partial<VisitForm>) ?? null,
    }));
  } catch {
    return []; // offline: packet status shows unknown
  }
}

export async function listReports(limit = 50): Promise<SavedReport[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, created_at, form_data")
    .eq("status", "active")
    .eq("clinic_id", activeClinicId())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const p = (r.form_data as VisitForm | null)?.patient;
    return {
      id: r.id as string,
      mode: r.mode as ReportMode,
      dos: r.dos as string,
      created_at: r.created_at as string,
      patient_label: p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "(unnamed)" : "(unnamed)",
    };
  });
}

export async function getReportHtml(id: string): Promise<string | null> {
  const { data, error } = await supabase().from("reports").select("report_html").eq("id", id).single();
  if (error) return null;
  return (data?.report_html as string) ?? null;
}

// ---------- User administration (admin role only, enforced by RLS) ----------

export interface AppUserRow {
  user_id: string;
  email: string;
  roles: string[];
  active: boolean;
  clinic_id: string | null;
}

export async function listAppUsers(): Promise<AppUserRow[]> {
  const { data, error } = await supabase()
    .from("app_users")
    .select("user_id, email, roles, active, clinic_id")
    .order("email");
  if (error) throw error;
  return (data ?? []) as AppUserRow[];
}

export async function updateAppUser(userId: string, partial: { roles?: string[]; active?: boolean; clinic_id?: string | null }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase().from("app_users").update(partial).eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------- Attorney package ----------

/** Lightweight metadata for every active report (no HTML) — used to group patient cases. */
export async function listReportMeta(): Promise<{ id: string; mode: string; dos: string; created_at: string; form: Partial<VisitForm> | null }[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, created_at, form_data")
    .eq("status", "active")
    .eq("clinic_id", activeClinicId())
    .order("dos", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    mode: r.mode as string,
    dos: r.dos as string,
    created_at: (r.created_at as string) ?? "",
    form: (r.form_data as Partial<VisitForm>) ?? null,
  }));
}

/** Full documents for one patient's case, by report ids. */
export async function fetchReportsByIds(
  ids: string[],
): Promise<{ id: string; mode: string; dos: string; html: string; cpt: string[] }[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, report_html, cpt_codes")
    .in("id", ids)
    .order("dos", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    mode: r.mode as string,
    dos: r.dos as string,
    html: (r.report_html as string) ?? "",
    cpt: (r.cpt_codes as string[] | null) ?? [],
  }));
}

/** PHI-light disclosure log for attorney releases (who, to whom, which charts). */
export async function logDisclosure(details: object): Promise<void> {
  try {
    await supabase().from("audit_log").insert({
      action: "attorney_package_disclosure",
      entity_type: "reports",
      details,
      clinic_id: activeClinicId(),
    });
  } catch {
    // disclosure logging must never block the release itself
  }
}

// ---------- Medical Director governance ----------

export interface MonthChart {
  id: string;
  mode: string;
  dos: string;
  /** patient initials only — the governance/admin layer never stores PHI */
  patient_initials: string;
  telehealth: boolean;
  form: VisitForm;
  icd_codes: string[];
  cpt_codes: string[];
}

function initialsOf(first?: string, last?: string): string {
  const i = (s?: string) => (s?.trim() ? `${s.trim()[0].toUpperCase()}.` : "");
  return `${i(first)}${i(last)}` || "—";
}

/** All active reports with a date of service inside the rolling window ending on `endDate` (inclusive). */
export async function listReportsForWindow(endDate: string, days = 30): Promise<MonthChart[]> {
  const end = new Date(endDate + "T00:00:00Z");
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, form_data, icd_codes, cpt_codes")
    .eq("status", "active")
    .eq("clinic_id", activeClinicId())
    .gte("dos", startIso)
    .lte("dos", endDate)
    .order("dos", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const f = r.form_data as VisitForm | null;
    const p = f?.patient;
    return {
      id: r.id as string,
      mode: r.mode as string,
      dos: r.dos as string,
      patient_initials: initialsOf(p?.firstName, p?.lastName),
      telehealth: f?.visitMode === "telehealth",
      form: (f ?? {}) as VisitForm,
      icd_codes: (r.icd_codes as string[] | null) ?? [],
      cpt_codes: (r.cpt_codes as string[] | null) ?? [],
    };
  });
}

export function windowStart(endDate: string, days = 30): string {
  const end = new Date(endDate + "T00:00:00Z");
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  return start.toISOString().slice(0, 10);
}

// ---------- Clinic catalogs & billing identity (cloud) ----------

export interface DxCatalogRow {
  id: string;
  code: string;
  description: string;
  region: string | null;
  kind: string | null;
  auto_derive: boolean;
  active: boolean;
}

export async function listDxCatalog(): Promise<DxCatalogRow[]> {
  const { data, error } = await supabase()
    .from("clinic_dx_catalog")
    .select("id, code, description, region, kind, auto_derive, active")
    .eq("clinic_id", activeClinicId())
    .order("region")
    .order("code");
  if (error) throw error;
  return (data ?? []) as DxCatalogRow[];
}

export async function upsertDxCatalog(row: Omit<DxCatalogRow, "id"> & { id?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase()
      .from("clinic_dx_catalog")
      .upsert({ ...row, clinic_id: activeClinicId() }, { onConflict: "clinic_id,code" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ServiceCatalogRow {
  id: string;
  cpt: string;
  name: string;
  category: string | null;
  default_units: number;
  charge: string | null;
  active: boolean;
}

export async function listServiceCatalog(): Promise<ServiceCatalogRow[]> {
  const { data, error } = await supabase()
    .from("clinic_service_catalog")
    .select("id, cpt, name, category, default_units, charge, active")
    .eq("clinic_id", activeClinicId())
    .order("category")
    .order("cpt");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, charge: r.charge === null ? null : String(r.charge) })) as ServiceCatalogRow[];
}

export async function upsertServiceCatalog(row: Omit<ServiceCatalogRow, "id"> & { id?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase()
      .from("clinic_service_catalog")
      .upsert(
        { ...row, charge: row.charge ? Number(row.charge) : null, clinic_id: activeClinicId() },
        { onConflict: "clinic_id,cpt" },
      );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface CarrierRow {
  id: string;
  name: string;
  payer_id: string | null;
  claims_address: string | null;
  billing_contact: string | null;
  claims_phone: string | null;
  notes: string | null;
  active: boolean;
}

export async function listCarriers(): Promise<CarrierRow[]> {
  const { data, error } = await supabase()
    .from("clinic_insurance_carriers")
    .select("id, name, payer_id, claims_address, billing_contact, claims_phone, notes, active")
    .eq("clinic_id", activeClinicId())
    .order("name");
  if (error) throw error;
  return (data ?? []) as CarrierRow[];
}

export async function upsertCarrier(row: Omit<CarrierRow, "id"> & { id?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase()
      .from("clinic_insurance_carriers")
      .upsert({ ...row, clinic_id: activeClinicId() }, { onConflict: "clinic_id,name" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface ClinicBillingIdentity {
  ein: string;
  billing_npi: string;
  rendering_npi: string;
}

export async function loadClinicBilling(): Promise<ClinicBillingIdentity | null> {
  try {
    const { data, error } = await supabase()
      .from("clinic_settings")
      .select("ein, billing_npi, rendering_npi")
      .eq("clinic_id", activeClinicId())
      .maybeSingle();
    if (error) throw error;
    return data ? { ein: data.ein ?? "", billing_npi: data.billing_npi ?? "", rendering_npi: data.rendering_npi ?? "" } : null;
  } catch {
    return null;
  }
}

export async function saveClinicBilling(b: ClinicBillingIdentity): Promise<void> {
  const { error } = await supabase()
    .from("clinic_settings")
    .upsert({ clinic_id: activeClinicId(), ...b, updated_at: new Date().toISOString() }, { onConflict: "clinic_id" });
  if (error) throw error;
}

/** Pull cloud billing identity + service charges into the local cache used by the document builders. */
export async function syncBillingFromCloud(): Promise<void> {
  const local = loadBillingSettings();
  const [identity, services] = await Promise.all([loadClinicBilling(), listServiceCatalog().catch(() => [] as ServiceCatalogRow[])]);
  const fees = { ...local.fees };
  for (const row of services) {
    if (row.active && row.charge) fees[row.cpt] = row.charge;
    else delete fees[row.cpt];
  }
  saveBillingSettings({
    ein: identity?.ein || local.ein,
    billingNpi: identity?.billing_npi || local.billingNpi,
    renderingNpi: identity?.rendering_npi || local.renderingNpi,
    fees,
  });
  await syncImagingFromCloud();
}

export async function loadImagingConfigCloud(): Promise<ImagingConfig | null> {
  try {
    const { data, error } = await supabase()
      .from("clinic_settings")
      .select("imaging_mode, dx_center_name, dx_center_address, dx_center_phone, dx_center_fax")
      .eq("clinic_id", activeClinicId())
      .maybeSingle();
    if (error || !data) return null;
    const base = defaultImagingConfig();
    return {
      mode: (data.imaging_mode as ImagingConfig["mode"]) || base.mode,
      centerName: data.dx_center_name ?? base.centerName,
      centerAddress: data.dx_center_address ?? base.centerAddress,
      centerPhone: data.dx_center_phone ?? base.centerPhone,
      centerFax: data.dx_center_fax ?? base.centerFax,
    };
  } catch {
    return null;
  }
}

export async function saveImagingConfigCloud(c: ImagingConfig): Promise<void> {
  saveImagingConfig(c);
  const { error } = await supabase()
    .from("clinic_settings")
    .upsert(
      {
        clinic_id: activeClinicId(),
        imaging_mode: c.mode,
        dx_center_name: c.centerName || null,
        dx_center_address: c.centerAddress || null,
        dx_center_phone: c.centerPhone || null,
        dx_center_fax: c.centerFax || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clinic_id" },
    );
  if (error) throw error;
}

async function syncImagingFromCloud(): Promise<void> {
  const cloud = await loadImagingConfigCloud();
  if (cloud) saveImagingConfig(cloud);
}
