-- ============================================================
-- AllyOS-wellness — auth/tenant model + RLS  (applied 2026-06-28)
-- Project: wkffjrwgittuikgzhdmx (allyos-wellness), org Falcon Medical Holdings.
-- Separate from the AHCA 'allyos' project. PHI-free by design.
-- This file is the version-controlled record of the migrations applied
-- via the Supabase MCP. Re-runnable (idempotent where practical).
-- ============================================================

-- ---- auth/tenant model ----
create table if not exists public.app_admin_emails (
  email text primary key, note text, created_at timestamptz default now());

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now());

create table if not exists public.clinic_members (
  user_id uuid references auth.users(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  role text not null default 'provider' check (role in ('provider','nurse','admin')),
  is_md boolean not null default false,
  created_at timestamptz default now(),
  primary key (user_id, clinic_id));

-- ---- helper functions (SECURITY DEFINER, STABLE, pinned search_path) ----
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid()); $$;

create or replace function public.is_clinic_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clinic_members where user_id = auth.uid() and clinic_id = cid); $$;

create or replace function public.is_clinic_md(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clinic_members where user_id = auth.uid() and clinic_id = cid and is_md)
      or public.is_app_admin(); $$;

-- ---- signup auto-provisioning (admin allowlist + provider-email link) ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.app_admin_emails where lower(email) = lower(new.email)) then
    insert into public.app_admins(user_id) values (new.id) on conflict do nothing;
  end if;
  insert into public.clinic_members(user_id, clinic_id, role, is_md)
  select new.id, p.clinic_id, p.role, p.md_of_record
  from public.providers p
  where lower(p.email) = lower(new.email) and p.clinic_id is not null
  on conflict do nothing;
  return new;
end; $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

insert into public.app_admin_emails(email, note)
values ('armandofalcon66@gmail.com', 'Armando A. Falcon, MD (FL ME 84789) — Medical Director / app admin')
on conflict (email) do nothing;

-- ---- audit_encounters: line dimension + per-clinic composite PK ----
alter table public.audit_encounters add column if not exists line text default 'iv';
alter table public.audit_encounters alter column clinic_id set not null;
alter table public.audit_encounters drop constraint if exists audit_encounters_pkey;
alter table public.audit_encounters add primary key (clinic_id, id);

-- ---- enable RLS on every table ----
alter table public.clinics            enable row level security;
alter table public.providers          enable row level security;
alter table public.ingredients        enable row level security;
alter table public.ingredient_screens enable row level security;
alter table public.protocols          enable row level security;
alter table public.audit_encounters   enable row level security;
alter table public.app_admins         enable row level security;
alter table public.app_admin_emails   enable row level security;  -- no policies = deny all (service role only)
alter table public.clinic_members     enable row level security;

-- ---- policies ----
-- CDS library: any signed-in user reads; only app admins write
create policy lib_read_ing  on public.ingredients        for select to authenticated using (true);
create policy lib_write_ing on public.ingredients        for all    to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy lib_read_scr  on public.ingredient_screens for select to authenticated using (true);
create policy lib_write_scr on public.ingredient_screens for all    to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy lib_read_pro  on public.protocols          for select to authenticated using (true);
create policy lib_write_pro on public.protocols          for all    to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
-- clinics
create policy clinic_read   on public.clinics for select to authenticated using (public.is_clinic_member(id) or public.is_clinic_md(id));
create policy clinic_insert on public.clinics for insert to authenticated with check (public.is_app_admin());
create policy clinic_update on public.clinics for update to authenticated using (public.is_clinic_md(id)) with check (public.is_clinic_md(id));
create policy clinic_delete on public.clinics for delete to authenticated using (public.is_app_admin());
-- providers
create policy prov_read  on public.providers for select to authenticated using (public.is_clinic_member(clinic_id) or public.is_clinic_md(clinic_id));
create policy prov_write on public.providers for all    to authenticated using (public.is_clinic_md(clinic_id)) with check (public.is_clinic_md(clinic_id));
-- audit_encounters (de-identified)
create policy audit_read   on public.audit_encounters for select to authenticated using (public.is_clinic_member(clinic_id) or public.is_clinic_md(clinic_id));
create policy audit_insert on public.audit_encounters for insert to authenticated with check (public.is_clinic_member(clinic_id) or public.is_clinic_md(clinic_id));
create policy audit_update on public.audit_encounters for update to authenticated using (public.is_clinic_member(clinic_id) or public.is_clinic_md(clinic_id)) with check (public.is_clinic_member(clinic_id) or public.is_clinic_md(clinic_id));
create policy audit_delete on public.audit_encounters for delete to authenticated using (public.is_app_admin());
-- clinic_members
create policy cm_read  on public.clinic_members for select to authenticated using (user_id = auth.uid() or public.is_clinic_md(clinic_id));
create policy cm_write on public.clinic_members for all    to authenticated using (public.is_clinic_md(clinic_id)) with check (public.is_clinic_md(clinic_id));
-- app_admins (read own / admin; writes via trigger + service role only)
create policy admins_read on public.app_admins for select to authenticated using (user_id = auth.uid() or public.is_app_admin());

-- ============================================================================
-- 2026-06-29 · Clinic care-model config is OWNER-controlled (provisioning record)
-- ----------------------------------------------------------------------------
-- The clinics row holds what the clinic is provisioned for (lines + MD arrangement
-- + care model); billing depends on it. Add the RN-run IV flag and make config
-- writes owner-only so neither the RN nor the clinic's own MD can flip lines /
-- arrangement to drop the subscription. Clinics still READ their own row.
alter table public.clinics add column if not exists rn_iv_model boolean not null default false;

drop policy if exists clinic_update on public.clinics;
create policy clinic_update on public.clinics
  for update using (is_app_admin()) with check (is_app_admin());
-- GFE tab is hidden for a clinic ⇔ md_arrangement='renuviamd' AND rn_iv_model=true.
