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

## Features (per spec)

- **Visit toggle** Initial / Follow-Up / Final controls section visibility; **role toggle** Staff / Physician / PT controls permissions.
- **12 sections**: staff check-in, injury details (auto-narrative), PMH (aggravation narrative), general exam, functional ROM (4-point scale → estimated AAOS degrees), auto-populated ICD-10 assessment with physician override, plan of treatment (E/M, required medical-necessity rationale per visit type, 9 PT modalities with CPT), image orders (full X-ray catalog + MRI/CT/US, no skull section) with printable MAZEL order on clinic letterhead, follow-up imaging drag-and-drop review, final-visit discharge, PT daily session, PT weekly summary with Sunday–Saturday week math and day-by-day timeline from accident date.
- **Autosave**: drafts upsert to `form_state` keyed by device + visit mode, with localStorage fallback when offline.
- **Reports Archive**: lists all saved reports (including those from the previous build) with view/print.

## Deployment

`netlify.toml` is included (base `app-pimaster`, publish `dist`). Point the Netlify site at this repo/folder and map `pimaster.renuviamd.com`.

## Important compliance notes

This system stores patient identifiers together with clinical information — that is PHI under HIPAA when handled by the practice.

1. **Sign a BAA with Supabase** (Team plan or above) and with Netlify or host the frontend accordingly.
2. The `reports` and `form_state` tables currently have **public (anon) RLS policies** inherited from the previous build — anyone holding the publishable key from the JS bundle could read them. Recommended hardening: enable Supabase Auth for the three roles and restrict these policies to `authenticated`, then remove the public policies. The app's data layer is structured so this can be added without reworking the UI.
3. All auto-populated ICD-10 codes, narratives, and degree estimates are drafting aids; the physician reviews, overrides, and signs every note.

## Field-mapping notes

- ROM functional grades map to estimated AAOS degrees via `src/lib/rom.ts` (`Full` 100%, `Partial` 65%, `Limited` 35%, `Cannot` 10% of normal range).
- ICD-10 auto-population rules live in `src/lib/icd10.ts`; imaging CPT catalog and PT modality codes in `src/lib/cpt.ts`.
- Report letterhead/clinic constants in `src/lib/clinic.ts`.
