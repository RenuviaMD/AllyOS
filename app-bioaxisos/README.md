# BioaxisOS — Phase 0 (Foundation)

Clinical operations platform for RenuviaMD. This package is the operational app;
the static marketing site stays at the repo root.

> **Status: Phase 0 of the phased build.** Foundation only — security primitives,
> data layer, brand chrome, formulary import. The patient portal, doctor
> workspace, Protocol Designer, intake wizard, and Cal/Stripe webhooks are later
> phases. Paused here for clinician review before Phase 1.

## Stack

- **Next.js 14 (App Router) + TypeScript (strict)** — server actions for mutations
- **Tailwind** — operational theme (cyan `#22D3EE`, Manrope/Inter/IBM Plex Mono, HUD grid; ornament stripped: no glow/particles/marquees)
- **PostgreSQL on DigitalOcean Managed Postgres** + **Drizzle ORM** (migrations in `./drizzle`)
- **jose** signed-cookie sessions (Phase 0 issuer; Auth.js/IdP wiring is Phase 1)
- **Zod** — single typed contract for env, formulary, and (later) all network payloads

## What Phase 0 delivers

| Area | File(s) | Guarantee |
|---|---|---|
| Audit primitive | `src/lib/audit/` | Every PHI read/write routes through `withAudit()` → append-only `audit_log`. Logs only on success. |
| No-PHI email | `src/lib/email/` | Public API takes `{to, templateId, portalPath}` only — **no body field**. PHI cannot enter an email by construction (spec §12). |
| RBAC | `src/lib/auth/rbac.ts` | `requireRole` + `canAccessPatient` (row-level ownership: admin / owning-provider / self). Pure, exhaustively tested. |
| Sessions | `src/lib/auth/session.ts` | HS256 signed cookie; stable `Session` shape the guards consume. |
| Data model | `src/lib/db/schema.ts` | `users` / `patients` (owning provider) / `audit_log`. |
| Formulary import | `src/lib/formulary/` | Zod-validates all 29 cards in `_research/formulary/` at build; slug must match filename. |
| Brand chrome | `src/app/`, `src/components/` | Tokens, HUD grid, DNA-helix favicon, operational UI primitives. |

## Quality gates (all green)

```bash
pnpm typecheck   # tsc --noEmit — PASS
pnpm lint        # next lint, 0 warnings — PASS
pnpm test        # vitest, 20/20 — PASS
pnpm build       # next build — PASS
```

## Local dev

```bash
cp .env.example .env.local      # set AUTH_SECRET (openssl rand -base64 32)
pnpm install
pnpm dev                        # http://localhost:3000
# exercise the session/RBAC seam (dev only):
#   GET /dev-login?role=provider   issues a signed session cookie
```

`SKIP_ENV_VALIDATION=1` lets CI build without secrets; runtime accessors still
throw if a value they need is missing.

## Database (DigitalOcean)

I can't provision the DO database from here, same as Netlify. To wire it up:

1. Create a **Managed Postgres** cluster in DigitalOcean; create a `bioaxisos` DB.
2. Put the **pooled** (PgBouncer, port 25061) connection string + `?sslmode=require` in `DATABASE_URL`; add the DO CA cert to `DATABASE_CA_CERT`.
3. `pnpm db:generate` then `pnpm db:migrate`.

## Deploy (Netlify — connect once)

`netlify.toml` is committed. In Netlify: **Add new site → Import from GitHub →**
`armandofalcon66/renuviamd-site`, **Base directory** `app-bioaxisos`. Set env vars
(`AUTH_SECRET`, `DATABASE_URL`, `DATABASE_CA_CERT`, `APP_URL`, `EMAIL_FROM`,
`EMAIL_API_KEY`). The `@netlify/plugin-nextjs` runtime handles SSR/server actions.

## Phase 0 → Phase 1 boundary (the seams)

- **Auth:** swap the `/dev-login` issuer for the real authentication flow — `Session` shape and all guards stay put.
- **Email:** connect the provider call inside `sendPortalEmail` — signature unchanged.
- **Audit:** `postgresAuditSink` is live; server actions must wrap PHI ops in `withAudit`.
