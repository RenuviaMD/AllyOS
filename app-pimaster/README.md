# PI Master™ by RenuviaMD® Network

Clinical Documentation System for Personal Injury Cases — Wellness Healthcare Clinic Corp (Doral, FL).

Built to the **Final Build Specification & Authorization** of April 3, 2026 (Professional Medical palette, Option 1 — teal + gold). This app is the rebuilt frontend for the existing `pi-master` Supabase project; it reads and writes the same `reports` / `form_state` tables used by the previous build, so all prior reports remain available in the Reports Archive.

## Stack

- Vite + React 18 + TypeScript
- Supabase (`pi-master` project, ref `fkwqzmnqflmkchiszxub`) for drafts (`form_state`) and finalized reports (`reports`)
- Reports are generated as letterhead HTML and opened in a print window (print → Save as PDF / fax)

## Run

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build (dist/)
npm test           # vitest unit tests (ICD-10 mapping, week math, narratives, ROM)
```

Supabase URL/key default to the live `pi-master` project (publishable key — safe to ship in the bundle). Override with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars if needed.

## Visit modality (In-Person / Telehealth)

Every visit carries a modality toggle next to the visit-type toggle. Telehealth visits are **facility-originated and Florida-only**: the patient is always physically at the clinic (originating site) with staff in attendance; the provider evaluates from a distant site. Selecting Telehealth:

- requires documented patient consent (captured with the staff member's name) before a note can be generated;
- inserts the telehealth origination + consent statement into the note automatically;
- switches the exam to **observation-only**: hands-on findings (spine tenderness/spasm, joint tenderness) are hidden and blocked by the audit; vitals are attributed to on-site staff;
- the functional exam (verbal-script maneuvers, WNL / Limited / Cannot perform) is valid in both modalities — normal degree values are reference ranges only and are never recorded as measurements.

A pre-generation audit (`src/lib/audit.ts`) blocks notes with missing identity/accident data, missing medical-necessity rationale, missing telehealth consent, hands-on findings on telehealth visits, or a final visit without an outcome.

## Scope

PI Master handles **clinical operations only** — documentation, orders, and billing documents. Medical-director governance and facility compliance are handled in a separate external system; PI Master's only governance touchpoint is the **Encounter Export** (last-30-days risk-scored CSV plus per-chart Report/Superbill).

## PI/PIP documentation & billing

- **EMC determination** is a required field on every initial visit (FL PIP § 627.736 — $10,000 vs $2,500 benefit). When YES, the app generates the clinic's **Certification of Emergency Medical Condition** (statutory definition, auto-checked body regions, paired sprain/strain/pain ICD-10 codes, physician certification language) replicating the existing paper form.
- **Causation Statement, Prognosis, and Physician Certification** print on every clinical note, composed strictly from the physician's documented selections — never auto-asserted.
- **Same-accident clone guard**: before a note generates, its narrative is compared (word n-gram similarity, narrative sections only — boilerplate excluded) against notes of other patients from the same accident date. Above 20% similarity the note is blocked until patient-specific history/findings are documented; near-identical exam findings raise a warning to document distinguishing findings, never to fabricate differences. Scores are stored in the report's audit trail.
- **Billing**: per-device Billing Settings (EIN, billing/rendering NPI, fee schedule — blank charges print blank, never estimated) drive a per-encounter **Superbill** and a **CMS-1500 (02/12) print replica** with auto accident = YES/FL, accident date (qualifier 439), ICD-10 codes A–L with pointers, and modality-aware service lines: POS 11 in person, POS 02 + modifier 95 for facility-originated telehealth (never POS 10 — the patient is never at home).
- Initial and final visits default to in-person; documenting them as telehealth requires a recorded reason (audit-enforced).

## Features (per spec)

- **Visit toggle** Initial / Follow-Up / Final controls section visibility; **role toggle** Staff / Physician / PT controls permissions.
- **12 sections**: staff check-in, injury details (auto-narrative), PMH (aggravation narrative), general exam, functional ROM (4-point scale → estimated AAOS degrees), auto-populated ICD-10 assessment with physician override, plan of treatment (E/M, required medical-necessity rationale per visit type, 9 PT modalities with CPT), image orders (full X-ray catalog + MRI/CT/US, no skull section) with printable MAZEL order on clinic letterhead, follow-up imaging drag-and-drop review, final-visit discharge, PT daily session, PT weekly summary with Sunday–Saturday week math and day-by-day timeline from accident date.
- **Autosave**: drafts upsert to `form_state` keyed by device + visit mode, with localStorage fallback when offline.
- **Reports Archive**: lists all saved reports (including those from the previous build) with view/print.

## Deployment

`netlify.toml` is included (base `app-pimaster`, publish `dist`). Point the Netlify site at this repo/folder and map `pimaster.renuviamd.com`.

## Authentication & access

Sign-in is required (Supabase Auth). Roles come from the `app_users` table — staff / physician / pt, with `admin` unlocking all views — and Row Level Security enforces them server-side: clinical records require an active account; catalogs, billing settings, and the encounter export are restricted to physician/admin. Accounts are provisioned by the administrator (no open signup).

## Important compliance notes

This system stores patient identifiers together with clinical information — that is PHI under HIPAA when handled by the practice.

1. **Sign a BAA with Supabase** (Team plan or above) and with Netlify or host the frontend accordingly.
2. ~~Public RLS policies~~ — closed: all tables now require an authenticated, active `app_users` account; the inherited anon access was removed. (Note: this also disables the legacy PI Notes deployment's database access.)
3. All auto-populated ICD-10 codes, narratives, and degree estimates are drafting aids; the physician reviews, overrides, and signs every note.

## Field-mapping notes

- ROM functional grades map to estimated AAOS degrees via `src/lib/rom.ts` (`Full` 100%, `Partial` 65%, `Limited` 35%, `Cannot` 10% of normal range).
- ICD-10 auto-population rules live in `src/lib/icd10.ts`; imaging CPT catalog and PT modality codes in `src/lib/cpt.ts`.
- Report letterhead/clinic constants in `src/lib/clinic.ts`.
