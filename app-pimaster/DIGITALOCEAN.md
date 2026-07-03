# DigitalOcean migration runbook (planned — do NOT start without Dr. Falcon's go)

Decision on record: PI Master launches on Supabase cloud now; the backend moves to
DigitalOcean later. Everything is already wired so the swap needs **no application
rewrite** — the frontend reaches the backend only through `src/lib/store.ts`, and the
backend URL/key come from env vars (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
"Wired as if the BAA were signed" means: nothing in the app assumes a specific host,
PHI protections (RLS, disclosure logging, PHI-free exports, idle auto-logout) are all
enforced in code/database, not by the hosting vendor.

## Recommended shape: self-hosted Supabase on a DigitalOcean Droplet

Supabase is open source. Self-hosting it on DigitalOcean keeps 100% of the current
stack (Postgres + Auth + RLS + PostgREST API + Storage) so the app works unchanged.
The alternative (DO Managed PostgreSQL + hand-built API and auth) would mean months of
rework and is NOT recommended.

**Provision (one time):**
1. Droplet: 4 GB / 2 vCPU minimum (8 GB recommended), Ubuntu LTS, in `nyc` or `mia`
   region. Enable weekly droplet backups AND database-level backups (below).
2. Attach a DigitalOcean Volume for Postgres data (survives droplet rebuilds).
3. Install Docker + the official Supabase self-hosting compose stack.
4. Reserve a static IP; point `db.pimaster.renuviamd.com` (or similar) at it.
5. TLS via the built-in reverse proxy (Caddy/Traefik) — HTTPS only, no port 5432
   exposed publicly.

**Migrate data:**
1. Freeze writes (announce a maintenance window; the app queues drafts locally).
2. `pg_dump` the Supabase cloud project (schema + data, including `auth` schema so
   logins survive).
3. `pg_restore` into the droplet's Postgres. Verify: table counts, RLS policies
   (`pg_policies`), triggers, and the `app_users` rows.
4. Copy JWT secret / anon + service keys into the self-hosted stack **or** re-issue
   keys and update the frontend env vars.
5. Point the frontend at the new backend: set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` in Netlify env settings → redeploy. That is the entire
   frontend change.
6. Smoke test: sign in, load a draft, generate a note, superbill, Encounter Export,
   Visit Documents. Then un-freeze.
7. Keep the Supabase cloud project paused (not deleted) for 30 days as rollback.

**Rollback:** flip the two env vars back to the Supabase cloud values and redeploy.

## Compliance gates (in order, before real PHI moves)

1. **BAA with DigitalOcean** — signed BEFORE the production database migrates.
   DigitalOcean offers HIPAA-eligible infrastructure with a BAA on request
   (verify current terms at migration time; if unavailable for the chosen product,
   stop and reassess — this gate is absolute).
2. Encryption at rest on the Postgres volume (LUKS or DO volume encryption) and
   TLS in transit (already required above).
3. Backups encrypted and access-controlled; test one restore before cutover.
4. Access: SSH keys only, no password auth, fail2ban, OS auto-updates.

## Until migration

Supabase cloud remains the backend. Its own BAA (Team plan) is the equivalent gate
there before real patient volume. The app's PHI posture is host-independent either
way: RLS locked to authenticated active users, per-clinic scoping, PHI-free admin
exports, disclosure logging, 20-minute idle auto-logout.
