# AllyOS Cloud — Supabase backend

**Project:** `allyos-wellness` (`wkffjrwgittuikgzhdmx`) · org **Falcon Medical Holdings** · Pro plan · us-east-1
**API URL:** `https://wkffjrwgittuikgzhdmx.supabase.co`
**Publishable key:** `sb_publishable_tT_jRgtBIl4P7STUGltbbg_GNslFxgj` (public-safe — RLS guards every table)

> ⚠️ This is a **separate** project from the AHCA `allyos` project (`bjjfedjowjvfkvdpudqw`), which is never touched.

## Design principle — PHI-free
AllyOS stays on-device (localStorage) and offline-first. The cloud is **additive**: auth, the clinic registry, and **de-identified** audit sync to the MD cockpit. **No patient identifiers ever go to Supabase** — audit rows carry risk flags, compliance booleans, and provider initials only. The MD needs no BAA because no PHI is centralized; PHI lives in the clinic's own chart/binder.

## Tables
| Table | Holds | Notes |
|---|---|---|
| `clinics` | Clinic registry (name, city, lines, MD arrangement, status) | PHI-free |
| `providers` | Clinic staff (name, credential, role, NPI, license, email) | Provider PII — private DB, not the public repo |
| `clinic_members` | `user ↔ clinic` map (role, is_md) | Drives tenant RLS |
| `ingredients` / `ingredient_screens` / `protocols` | The CDS library | Authoring destination |
| `audit_encounters` | **De-identified** audit rows | PK `(clinic_id, id)`, has `line` (iv/bhrt/peptides) |
| `app_admins` / `app_admin_emails` | Global/MD admins + signup allowlist | `app_admin_emails` = deny-all (service role only) |

## Access model (RLS — every table)
- **CDS library** → read for any signed-in user; writes only by **app admins** (you, authoring).
- **clinics / providers / audit** → **tenant-scoped**: a provider sees only their clinic; the **MD-of-record (app admin) reads across all clinics** → that is the cockpit.
- Helper functions `is_app_admin()`, `is_clinic_member(cid)`, `is_clinic_md(cid)` (SECURITY DEFINER) back the policies.
- **Auto-provisioning on signup** (`handle_new_user` trigger): an email in `app_admin_emails` becomes an admin; an email matching a `providers.email` is linked to that clinic with its role. `armandofalcon66@gmail.com` is seeded as the MD/admin.

## Activation (one-time)
1. Go to **`/allyos/login.html`** → **AllyOS Cloud sign-in** → enter `armandofalcon66@gmail.com` → click the magic link. The trigger makes you an app admin.
2. Open **`/allyos/md-audit.html`** (cockpit) → the banner flips to **“Live cloud sync active”** and your clinics load from the hub (Lemus is already seeded).
3. In a clinic's **`audit.html`** (opened from the cockpit) → **“☁ Sync to cloud”** pushes that clinic's de-identified rows; they appear in the cockpit automatically.

## Integration layer
`allyos/supabase-client.js` exposes `window.AllyOSCloud` — fail-soft (if offline/not-signed-in, the app keeps using localStorage). Methods: `signInWithOtp`, `signOut`, `user`, `listClinics`, `pushAudit`, `pullAudit`, `clinicSummaries`. Loaded by `login.html`, `md-audit.html`, `audit.html`.

## Auth email setup (to finish)
Supabase magic-link emails send via Supabase's default SMTP (rate-limited, fine for you/pilots). For production volume, set a custom SMTP + redirect URL allowlist in the Supabase dashboard (Auth → URL Configuration → add the deployed origin).

## SQL of record
`supabase/allyos-wellness-auth-rls.sql` — the full auth/tenant model + RLS, version-controlled.

## Security posture (advisor review 2026-06-29)
Verified live: all 8 tables have RLS enabled; `clinics` + `app_admin_emails` seeded (Lemus, `armandofalcon66@gmail.com`); RLS evaluates correctly as the `authenticated` role.

**`EXECUTE` on the helper functions was tightened** — Postgres grants function `EXECUTE` to `PUBLIC` by default; that inherited grant was revoked, leaving `is_app_admin()`, `is_clinic_md(uuid)`, `is_clinic_member(uuid)` executable only by `anon, authenticated, postgres, service_role`. (Verified: revoking from `authenticated` entirely **breaks RLS** — policy evaluation *does* require the querying role to hold `EXECUTE` on policy-referenced functions, so `authenticated`/`anon` must keep it.)

**Accepted low-risk advisory (lints 0028/0029):** these three SECURITY DEFINER helpers remain callable via REST RPC by signed-in users. This is **accepted** because each is a self-referential predicate that returns only the **caller's own** access status (am *I* an admin / a member / the MD of this clinic) — it exposes no other tenant's data and nothing the caller couldn't already determine. The DB is PHI-free regardless.
- **Proper future hardening** (clears the lint): move the three helpers into a non-API-exposed `private` schema (PostgREST only exposes `public`), which requires recreating the 19 RLS policies that reference them. Deferred as a discrete, staged change (do it on a Supabase branch + verify tenant isolation before merge) — not worth risking the live tenant boundary for a self-referential predicate.
