# BioaxisOS — PROJECT STATUS: ⏸️ ON HOLD

**As of 2026-06-14.** The platform is paused. All code is preserved on `main` in
working, CI-green condition; all recurring cloud spend is being cancelled. This
doc is the single source of truth to reactivate later.

> Decision: stepping back from the peptide-platform market for now. Nothing is
> deleted from the repo — only the paid infrastructure is torn down. Cal.com is
> kept (repurposed for the PIP practice calendar).

---

## TL;DR — to bring it back
1. Stand up a Postgres DB → apply migrations + seed.
2. Deploy `app-bioaxisos` to Netlify with 3 env vars.
3. (Optional) republish the marketing page.
4. Before any real patient: execute a BAA, set `BAA_SIGNED=true`, replace dev-login with real auth.
Details in **Reactivation** below.

---

## What was built (in standby, on `main`)
- **App:** `app-bioaxisos/` — Next.js 14 (App Router) + TypeScript + Tailwind + Drizzle ORM + Postgres. 14 routes, 40 tests, CI green.
- **Formulary:** `_research/formulary/` — 29 Zod-validated prescribing cards (22 individual + 7 stacks).
- **Phase 0 (foundation):** audit-log primitive (every PHI read/write), RBAC (role + row-level patient ownership), no-PHI email transport (link-only), jose session, env/compliance gate.
- **Phase 1 (features):** Protocol Designer (compliance-gated prescribe), patient check-in + flagger (pain≥7 / new mass / severe abdominal pain → MD inbox), MD inbox (provider-scoped), refill request/approve, patient roster + create-patient + chart detail timeline, prescription discontinue, admin audit viewer, operational dashboard, `BAA_SIGNED` synthetic-only banner + gated `/dev-login`.
- **Safety/CI:** `quality-gates` (typecheck/lint/test/build) + `protect-marketing` guard (blocks any change to public marketing files).
- **Walkthrough script:** `app-bioaxisos/docs/test-walkthrough.md`.

## What was deployed / paid infra (being torn down → see checklist)
| Resource | Identifier | Action |
|---|---|---|
| Supabase project | `bioaxisos-test` (ref `kbqlefkugkqyphdkezvh`, Falcon Medical Holdings org) | **DELETE** (−$10/mo) |
| DigitalOcean Postgres | `bioaxis-ops-db-dev` | **DESTROY** if running (−~$15/mo) |
| DigitalOcean Spaces | `bioaxis-ops-files-dev` | **DESTROY** if running (−~$5/mo) |
| Netlify — marketing | `bioaxis.renuviamd.com` | **UNPUBLISH** |
| Netlify — app (if created) | (test site) | **DELETE** |
| Cal.com | — | **KEEP** (PIP practice) |
| Stripe | — | no recurring charge; leave |
| Supabase PRO base ($25/mo) | shared org | **KEEP** — also hosts `allyos`, `pi-master`, `renuviamd-gate` |

After teardown, BioaxisOS-attributable recurring spend = **$0**.

---

## Teardown checklist (console-only — do these to stop billing)
1. **Supabase** → `bioaxisos-test` → Settings → General → **Delete project**. (Synthetic data only; reproducible from this repo.)
2. **DigitalOcean** → destroy `bioaxis-ops-db-dev` and `bioaxis-ops-files-dev`. (Were never used by the app — egress was blocked — so likely dead weight.)
3. **Netlify** → unpublish/delete the `bioaxis.renuviamd.com` site and any BioaxisOS app site.
4. Do **not** cancel the Supabase PRO plan (shared) or Cal.com (kept).

---

## Reactivation runbook
1. **Database:** create a Postgres (Supabase, Neon, DO, RDS — any). Apply `app-bioaxisos/drizzle/0000_*.sql` then `0001_*.sql` (or `pnpm db:migrate` with `DATABASE_URL` set). Optionally `pnpm db:seed` for synthetic data. Enable RLS on all tables (the app connects via the direct/pooled connection, which bypasses RLS).
2. **Deploy:** Netlify → import `renuviamd-site` → **Base directory `app-bioaxisos`** → env vars: `DATABASE_URL` (pooled string), `AUTH_SECRET` (`openssl rand -base64 32`), `APP_URL`. Leave `BAA_SIGNED` unset for synthetic mode.
3. **Marketing:** republish the root `index.html` site if desired (it auto-deploys from `main`).
4. **Go-live gate (real patients):** execute a BAA on the DB host + use a HIPAA-eligible config; set `BAA_SIGNED=true` (hides the synthetic banner and disables `/dev-login`); replace `/dev-login` with a real authentication flow.

## Not built (needs the real spec doc + live keys)
12-step intake wizard content, Florida attestation legal text, Cal.com / Stripe webhooks, production authentication.

## Unrelated open item (not BioaxisOS)
The separate `renuviamd-gate` Supabase project has **8 tables with RLS disabled**
(`gate_users`, `gate_cases`, `gate_case_timeline`, etc.) — exposed to anyone with
its anon key. Independent of this hold; still worth securing.
