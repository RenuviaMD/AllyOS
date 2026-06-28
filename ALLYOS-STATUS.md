# AllyOS — current status

**As of 2026-06-28.** Active development branch: `claude/funny-sagan-clvl38`. **`main` (production) is untouched** — nothing below is live until you choose to merge.

> Not to be confused with `PROJECT-STATUS.md`, which is the historical record of the **paused** BioaxisOS predecessor. AllyOS is the current product.

## The product
AllyOS — the honest, PHI-free clinical-AI operating system for wellness clinics, across **three lines of care**, each a physician-curated CDS module. You sell **structure + Ally** (the platform); the MD-of-record service is your separate business.

## Lines — all three locked & MD-signed
| Line | Module | State | Ally-grounded |
|---|---|---|---|
| IV / IM | `protocols/iv-module.json` | 🔒 Locked (3-auditor) | ✅ |
| BHRT (women's menopause wellness) | `protocols/bhrt-module.json` v1.5 | 🔒 Locked, MD-signed; 18/18 citations verified | ✅ |
| Peptides | `protocols/peptide-module.json` v1.0 | 🔒 Locked, MD-signed; VERIFY items MD-reviewed | ✅ |

Surfaces: IV → `chairside.html`; BHRT → `bhrt.html`; Peptides → `peptides.html` + `workspace.html`. Ally (`netlify/functions/ask.js`) grounds all three and honestly says PRP/Aesthetics aren't covered.

## AllyAuditPro (separate MD audit tool)
- Multi-clinic cockpit `md-audit.html` + practice review `audit.html`.
- **Line-aware §14 risk stratification** across IV / BHRT / peptides.
- Standalone from AHCA AuditPro (which is its own repo, untouched).

## Supabase backend — wired, secured, PHI-free
- Project **`allyos-wellness`** (`wkffjrwgittuikgzhdmx`) — separate from the AHCA `allyos` project (never touched).
- **RLS on every table** + auth/tenant model (`app_admins`, `clinic_members`, helper fns, signup trigger). You (`armandofalcon66@gmail.com`) seeded as MD/admin.
- App wired (fail-soft, additive to localStorage): magic-link sign-in (`login.html`), live cockpit sync (`md-audit.html`), `☁ Sync to cloud` (`audit.html`), cloud status badge (`dashboard.html`).
- Client: `allyos/supabase-client.js`. Docs: `supabase/SUPABASE.md`. SQL of record: `supabase/allyos-wellness-auth-rls.sql`.
- **No PHI ever leaves the clinic** → no BAA needed.

## Stripe — planned, NOT built
`STRIPE-PLAN.md` has the full design. **5 decisions needed from you** (§8): amounts+trial, per-clinic vs per-seat, which lines paid vs included, test-mode confirm, Tax/Portal. You have the Stripe account ready. When you're back: answer the 5 → I build in test mode end-to-end.

## Health
Dev/CI debugger green: **50 files, 0 errors, 0 warnings** (now covers standalone JS too). Runs daily + on push + at app-open.

## To resume
1. **Stripe** — answer the 5 decisions in `STRIPE-PLAN.md` §8.
2. **(When ready) go live** — decide what to merge from this branch to `main`, and activate the Supabase cloud sign-in.
