-- AllyOS — Supabase schema (NON-PHI ONLY)
-- =============================================================================
-- HARD RULE: this database holds NO patient PHI. No patient names, DOB, charts,
-- or identified encounters ever land here. Patient identity stays on-device
-- (localStorage) in the chairside app. The only patient-derived data permitted
-- below is the DE-IDENTIFIED audit encounter (Encounter ID + gates + risk flags),
-- which carries no identifier that maps back to a person without the clinic's
-- own chart. See protocols/AUTHORING.md §0 (the PHI boundary).
--
-- Apply with the Supabase MCP `apply_migration`, or `supabase db push`.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- clinics  (AUTHORING.md §4)
-- ---------------------------------------------------------------------------
create table if not exists clinics (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  city_state      text,
  phone           text,
  lines           text[] not null default '{iv}',          -- iv | peptides | bhrt
  md_arrangement  text not null default 'own'              -- renuviamd | own
                    check (md_arrangement in ('renuviamd','own')),
  md_of_record    boolean not null default false,          -- is RenuviaMD the MD here?
  own_md          jsonb,                                    -- {name,credential,npi,license,email} when md_arrangement='own'
  record_location text default 'Clinic chart / HIPAA binder (PHI not held by AllyOS)',
  status          text not null default 'onboarding'        -- onboarding | active | paused
                    check (status in ('onboarding','active','paused')),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- providers  (AUTHORING.md §3) — professional identifiers, NOT patient PHI
-- ---------------------------------------------------------------------------
create table if not exists providers (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid references clinics(id) on delete cascade,
  name          text not null,
  credential    text not null,                              -- MD | DO | NP | FNP | PA | RN | LPN
  role          text not null default 'provider'            -- provider | nurse | admin
                  check (role in ('provider','nurse','admin')),
  npi           text,
  state_license text,
  license_state text,
  email         text,
  can_sign      boolean not null default false,             -- may sign GFE/orders/notes
  md_of_record  boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  -- a signing provider must have an NPI on file
  constraint signing_needs_npi check (not can_sign or npi is not null)
);
create index if not exists providers_clinic_idx on providers(clinic_id);

-- ---------------------------------------------------------------------------
-- ingredients  (AUTHORING.md §1a) — drug/nutrient reference, no PHI
-- ---------------------------------------------------------------------------
create table if not exists ingredients (
  id                  text primary key,                     -- ING_<SHORTNAME>
  name                text not null unique,                 -- exact string protocols reference
  status              text not null default 'draft'         -- draft | published | locked
                        check (status in ('draft','published','locked')),
  requires_md_signoff boolean not null default true,
  in_primary_library  boolean not null default false,
  category            text[] default '{}',
  class               text,
  route               text,
  standard            text,                                 -- default dose/volume
  ceiling             text,                                 -- max per session
  rate                text,                                 -- rate floor if rate-sensitive
  absolute_ci         text,
  relative_ci         text,
  guardrail           text,
  monograph           jsonb,
  evidence_grade      text check (evidence_grade in ('A','B','C','D') or evidence_grade is null),
  source              text,
  citations           text[] default '{}',
  created_at          timestamptz not null default now()
);

-- screening rules drive the chairside bench guardrails (AUTHORING.md §1b)
create table if not exists ingredient_screens (
  id            bigint generated always as identity primary key,
  ingredient_id text not null references ingredients(id) on delete cascade,
  flag          text not null,                              -- renal|hepatic|cardiac|hypertension|diabetes|asthma|cancer|pregnancy|g6pd|bleeding|thyroid|allergy|recent_surgery
  level         text not null check (level in ('avoid','caution')),
  note          text
);
create index if not exists screens_ingredient_idx on ingredient_screens(ingredient_id);

-- ---------------------------------------------------------------------------
-- protocols / stacks  (AUTHORING.md §2, PROTOCOL-AUTHORING-FORMAT.md)
-- ---------------------------------------------------------------------------
create table if not exists protocols (
  id                  bigint generated always as identity primary key,
  code                text not null unique,                 -- IV-XX / WEL- / HYDR- / ADDON-
  title               text not null,
  version             text,
  type                text default 'pre-built stack',
  status              text not null default 'draft'         -- draft | locked
                        check (status in ('draft','locked')),
  requires_md_signoff boolean not null default true,
  indication          text,
  scope_limitation    text,
  base                text,
  components          jsonb not null default '[]',          -- [{ingredient,dose}] — each must resolve to ingredients.name
  optional_add_ons    jsonb default '[]',
  infusion_time       text,
  frequency           text,
  key_gates           text[] default '{}',
  evidence_grade      text check (evidence_grade in ('A','B','C','D') or evidence_grade is null),
  citations           text[] default '{}',
  in_primary_library  boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_encounters  (DE-IDENTIFIED — mirrors localStorage allyos_audit_v1)
-- No patient name/DOB. Encounter ID maps to the clinic's own chart, off-platform.
-- ---------------------------------------------------------------------------
create table if not exists audit_encounters (
  id            text primary key,                           -- Encounter ID e.g. LEMUS-202606-0001
  clinic_id     uuid references clinics(id) on delete set null,
  ym            text,                                       -- YYYYMM bucket
  enc_date      text,
  protocol      text,
  gfe           text,
  consent       boolean,
  mon_count     int,
  pre_vit       boolean,
  post_vit      boolean,
  aftercare     boolean,
  override      text,
  ae            boolean,
  suspended     boolean,
  suspend_reason text,
  risk_flags    text[] default '{}',
  risk          int,
  outcome       text,
  provider      text,                                       -- signing provider label (not a patient)
  audited       boolean default false,
  audit_pass    boolean,
  audit_note    text,
  created_at    timestamptz not null default now()
);
create index if not exists audit_clinic_month_idx on audit_encounters(clinic_id, ym);

-- ---------------------------------------------------------------------------
-- Row-Level Security — enable before exposing the anon key client-side.
-- (Policies intentionally omitted here; add per-clinic policies keyed on the
-- authenticated provider's clinic_id when wiring real auth.)
-- ---------------------------------------------------------------------------
-- alter table clinics            enable row level security;
-- alter table providers          enable row level security;
-- alter table ingredients        enable row level security;
-- alter table ingredient_screens enable row level security;
-- alter table protocols          enable row level security;
-- alter table audit_encounters   enable row level security;
