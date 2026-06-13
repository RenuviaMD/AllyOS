# BioaxisOS — Test Environment Runbook

Synthetic-data test environment for walking every Phase 1 flow before any real
patient is exposed. **`BAA_SIGNED` stays false** → the app shows a persistent
"SYNTHETIC DATA ONLY" banner and `/dev-login` is enabled. Never enter real PHI
until a BAA is executed and `BAA_SIGNED=true`.

## Stack
- **App:** Next.js (App Router) in `app-bioaxisos/`, deployed on **Netlify** (base dir `app-bioaxisos`).
- **DB:** Supabase Postgres project `bioaxisos-test` (ref `kbqlefkugkqyphdkezvh`, us-east-1) — schema + RLS applied, synthetic seed loaded.

## Deploy (one-time)
1. **DB password:** Supabase → `bioaxisos-test` → Connect (or Database settings) → reset/copy the password.
2. **Connection string** (transaction pooler):
   `postgresql://postgres.kbqlefkugkqyphdkezvh:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
3. **Netlify:** Add new project → import `renuviamd-site` from GitHub → **Base directory `app-bioaxisos`**.
4. **Env vars:** `DATABASE_URL` (step 2), `AUTH_SECRET` (`openssl rand -base64 32`), `APP_URL` (the Netlify URL). Leave `BAA_SIGNED` unset.
5. Deploy → open `/api/health` → expect `"database":{"configured":true}`, `"compliance":{"mode":"synthetic-only"}`.

## Login (synthetic sessions, seeded fixed UUIDs)
- Provider: `/dev-login?role=provider&userId=11111111-1111-1111-1111-111111111111`
- Patient:  `/dev-login?role=patient&userId=22222222-2222-2222-2222-222222222222`
- Admin:    `/dev-login?role=admin&userId=33333333-3333-3333-3333-333333333333`
- Logout:   `/logout`

## Walkthrough scenarios
Run as provider unless noted. After each, confirm the **expected** result.

| # | Action | Expected |
|---|---|---|
| 1 | `/workspace` dashboard | Live tiles: patients / flagged check-ins / pending refills (seed has 1 flagged) |
| 2 | `/workspace/patients` → Add patient (name + email) | New MRN appears in roster; success shows new portal userId |
| 3 | Open a patient → chart | Active protocols + check-in timeline; opening is recorded in the audit log |
| 4 | `/workspace/designer` → pick card → patient + dose → confirm 4 gate items → Prescribe | "Prescribed. Now active on the patient's chart." |
| 5 | Login as that patient → `/portal` | Active protocol listed; check-in form present |
| 6 | Patient check-in: pain 8 + "new lump" | Live preview flags it; submit → "care team alerted" |
| 7 | Patient: Request refill on a protocol | "Refill requested" |
| 8 | Back as provider → `/workspace/inbox` | The flagged check-in appears (ONLY your patients) |
| 9 | `/workspace/refills` → Approve/Deny | Status updates |
| 10 | Chart → Discontinue a protocol | Removed from active list |
| 11 | Login as admin → `/workspace/audit` | Recent access events (who/what/when/PHI), no PHI content |

## Invariants to verify (the point of the test)
- **Row-level ownership:** a provider sees only their own patients (roster, inbox, refills). Admin sees all.
- **Audit:** every PHI read/write (prescribe, check-in, chart open, refill, discontinue) lands in `audit_log`.
- **No PHI in email:** the email transport only ever sends a portal link (see `src/lib/email`).
- **Synthetic banner** visible on every page; `/dev-login` enabled.

## Not yet built (spec/keys-gated — out of scope for this test)
- 12-step intake wizard content + Florida attestation text
- Cal.com / Stripe webhooks
- Real authentication (replaces `/dev-login`)

## Re-seed (if the DB is wiped)
Migrations `drizzle/0000_*.sql` + `0001_*.sql`, then the synthetic seed in
`src/lib/db/seed.ts` (`pnpm db:seed` with `DATABASE_URL` set), or re-run the
seed SQL via the Supabase SQL editor.
