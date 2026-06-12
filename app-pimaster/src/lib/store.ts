import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadBillingSettings, saveBillingSettings } from "./billing";
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

export type ReportMode = "initial" | "followup" | "final" | "ptdaily" | "ptprogress";

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
        { device_key: deviceKey(), mode: form.visitType, state_data: form, updated_at: new Date().toISOString() },
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
      clinic_id: "wellness_hcc",
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
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
      .order("created_at", { ascending: false })
      .limit(200);
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

export async function listReports(limit = 50): Promise<SavedReport[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, created_at, form_data")
    .eq("status", "active")
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

/** All active reports with a date of service inside the given YYYY-MM month. */
export async function listReportsForMonth(month: string): Promise<MonthChart[]> {
  const { data, error } = await supabase()
    .from("reports")
    .select("id, mode, dos, form_data, icd_codes, cpt_codes")
    .eq("status", "active")
    .gte("dos", `${month}-01`)
    .lt("dos", nextMonth(month))
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

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export async function saveGovernanceReview(args: {
  month: string;
  targetCount: number;
  reviewer: string;
  items: object[];
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase().from("governance_reviews").insert({
      review_month: args.month,
      target_count: args.targetCount,
      reviewer: args.reviewer,
      items: args.items,
      report_html: args.html,
      clinic_id: "wellness_hcc",
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface GovernanceReviewRow {
  id: string;
  review_month: string;
  target_count: number;
  reviewer: string | null;
  created_at: string;
}

export async function listGovernanceReviews(): Promise<GovernanceReviewRow[]> {
  const { data, error } = await supabase()
    .from("governance_reviews")
    .select("id, review_month, target_count, reviewer, created_at")
    .order("created_at", { ascending: false })
    .limit(48);
  if (error) throw error;
  return (data ?? []) as GovernanceReviewRow[];
}

export async function getGovernanceReviewHtml(id: string): Promise<string | null> {
  const { data, error } = await supabase().from("governance_reviews").select("report_html").eq("id", id).single();
  if (error) return null;
  return (data?.report_html as string) ?? null;
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
    .order("region")
    .order("code");
  if (error) throw error;
  return (data ?? []) as DxCatalogRow[];
}

export async function upsertDxCatalog(row: Omit<DxCatalogRow, "id"> & { id?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase()
      .from("clinic_dx_catalog")
      .upsert({ ...row, clinic_id: "wellness_hcc" }, { onConflict: "clinic_id,code" });
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
        { ...row, charge: row.charge ? Number(row.charge) : null, clinic_id: "wellness_hcc" },
        { onConflict: "clinic_id,cpt" },
      );
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
      .eq("clinic_id", "wellness_hcc")
      .maybeSingle();
    if (error) throw error;
    return data ? { ein: data.ein ?? "", billing_npi: data.billing_npi ?? "", rendering_npi: data.rendering_npi ?? "" } : null;
  } catch {
    return null;
  }
}

export async function saveClinicBilling(b: ClinicBillingIdentity): Promise<void> {
  await supabase()
    .from("clinic_settings")
    .upsert({ clinic_id: "wellness_hcc", ...b, updated_at: new Date().toISOString() }, { onConflict: "clinic_id" });
}

/** Pull cloud billing identity + service charges into the local cache used by the document builders. */
export async function syncBillingFromCloud(): Promise<void> {
  const local = loadBillingSettings();
  const [identity, services] = await Promise.all([loadClinicBilling(), listServiceCatalog().catch(() => [] as ServiceCatalogRow[])]);
  const fees = { ...local.fees };
  for (const s of services) {
    if (s.charge) fees[s.cpt] = s.charge;
  }
  saveBillingSettings({
    ein: identity?.ein || local.ein,
    billingNpi: identity?.billing_npi || local.billingNpi,
    renderingNpi: identity?.rendering_npi || local.renderingNpi,
    fees,
  });
}
