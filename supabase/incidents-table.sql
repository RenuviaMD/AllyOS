-- ============================================================================
-- AllyOS · incidents table  (APPLIED 2026-06-30 → project allyos-wellness)
-- ----------------------------------------------------------------------------
-- Backs the Cockpit Debugging / Incident-Triage Agent (protocols/cockpit-debug-agent).
-- A clinic reports a field incident from the dashboard; it lands here PHI-FREE and
-- appears in the MD cockpit's Incident-Triage queue. Mirrors gfe_requests exactly:
-- clinic members + the clinic MD + app_admin can read; members/MD can insert;
-- only the MD / app_admin may triage (update status, severity, disposition).
--
-- PHI rule (from clinic_incident_trigger_schema_v1): NEVER store patient name,
-- full DOB, phone, email, address, SSN, insurance/payment, or raw chart text.
-- `diagnostic` holds the Get-Help snapshot, which is STATE METADATA ONLY.
--
-- Apply (after approval): paste into Supabase SQL editor, or
--   supabase db execute < supabase/incidents-table.sql
-- ============================================================================
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  environment text,                 -- which station: nursing-station | gfe | workspace | bhrt | schedule | cockpit
  workflow text,                    -- what they were doing
  incident_summary text not null,   -- the clinic's de-identified description
  expected_behavior text,
  actual_behavior text,
  safety_concern text not null default 'unknown' check (safety_concern in ('yes','no','unknown')),
  sev text check (sev in ('SEV-1','SEV-2','SEV-3','SEV-4','SEV-5')),
  failure_class text,               -- from the master prompt's failure-class list
  module text,                      -- from debug_module_inventory (MOD_001..010)
  triage jsonb not null default '{}'::jsonb,    -- the Debugger Agent output
  diagnostic jsonb not null default '{}'::jsonb,-- PHI-free device/app snapshot (metadata only)
  reporter_role text,
  prompt_version text, model_version text, manifest_version text,
  status text not null default 'open'
    check (status in ('open','triaged','mitigated','fixed','awaiting_review','closed')),
  disposition text,                 -- MD's note on close
  reviewer text, reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.incidents enable row level security;
create policy incident_read   on public.incidents for select using (is_clinic_member(clinic_id) or is_clinic_md(clinic_id) or is_app_admin());
create policy incident_insert on public.incidents for insert with check (is_clinic_member(clinic_id) or is_clinic_md(clinic_id));
-- clinics REPORT; only the MD / owner TRIAGES (severity + status are a clinical judgement)
create policy incident_update on public.incidents for update using (is_clinic_md(clinic_id) or is_app_admin()) with check (is_clinic_md(clinic_id) or is_app_admin());

create index if not exists incidents_clinic_status_idx on public.incidents (clinic_id, status, created_at desc);
