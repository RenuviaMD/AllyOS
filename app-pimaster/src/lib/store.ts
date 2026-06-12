import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
