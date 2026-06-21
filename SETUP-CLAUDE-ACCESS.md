# Giving Claude Full Access — Mac + Web Cockpits

Goal: let Claude work across **all** RenuviaMD repositories and Netlify sites,
from both **Claude Code on your Mac** (the cockpit, no access walls) and
**Claude Code on the web** (scoped, sandboxed spokes).

> Key fact that drives everything: **local Mac Claude inherits *your* credentials**
> and can reach anything you can `git clone` / `netlify` to. **Web Claude is walled**
> by repo scope + network egress. So the Mac is where "handle everything" lives.

---

## Phase 0 — Decide the survivors (2 min)

- **GitHub home:** the `RenuviaMD` organization. Everything consolidates here.
- **Netlify home:** the team that already owns `myfloridamedicaldirector.com`
  (moving a live domain is the riskiest step — make the account that already
  has it the destination).

Write the two answers down. Every later step points at them.

---

## Phase 1 — Mac cockpit (the real full-access unlock) ✅ do this first

### 1.1 Install the three tools
```bash
# Claude Code
npm install -g @anthropic-ai/claude-code      # or: curl -fsSL https://claude.ai/install.sh | bash

# GitHub CLI
brew install gh

# Netlify CLI
npm install -g netlify-cli
```

### 1.2 Authenticate (this is what grants Claude access)
```bash
gh auth login          # choose GitHub.com → HTTPS → browser; use the account that can see the RenuviaMD org
netlify login          # opens browser; log in to the SURVIVING Netlify team
```
Verify:
```bash
gh repo list RenuviaMD --limit 100      # you should see all the org repos
netlify sites:list                       # you should see your sites
```

### 1.3 Put every repo in ONE folder
```bash
mkdir -p ~/RenuviaMD && cd ~/RenuviaMD
gh repo list RenuviaMD --limit 200 --json name -q '.[].name' \
  | xargs -I {} gh repo clone RenuviaMD/{}
```
(Also clone the personal one until it's transferred:
`gh repo clone armandofalcon66/renuviamd-site`.)

### 1.4 Open the cockpit
```bash
cd ~/RenuviaMD
claude
```
Now Claude sees every repo on disk at once — no scope wall, no 403.
Add a top-level `CLAUDE.md` mapping the three product lines (template at bottom).

**Checkpoint:** ask Claude "list every repo folder here and the stack of each."
If it answers, full local access is live.

---

## Phase 2 — Web spokes (scoped, for mobile / sandboxed work)

### 2.1 Install the Claude GitHub App on the org
GitHub → `RenuviaMD` org → **Settings → GitHub Apps / Installed Apps →
Claude → Configure** → grant repository access (specific repos or "All").

### 2.2 Create ONE environment per product line (not one giant one)
- **MD env:** `AHCAClinicPortal` + `medical-director-console` + `renuviamd-os-prototype`
- **PIP env:** `PI-Master-` + `PIP-notes-` + the SaaS repo
- **Peptides env:** `renuviamd-site` + the peptide-OS repo

### 2.3 Netlify on web (optional, later)
Web egress is blocked by default (that's why web Claude gets HTTP 403 on your
live site). To let web Claude drive Netlify, add a **Netlify MCP connector** or
put a Netlify token in the environment's secrets + allow the Netlify API host.
Until then, web sessions can read code but not drive deploys — by design.

---

## Phase 3 — Consolidate (makes both cockpits point at one truth)

- **GitHub:** transfer `armandofalcon66/renuviamd-site` into the org
  (repo → Settings → Danger Zone → **Transfer ownership** → `RenuviaMD`).
  History, issues, PRs preserved; old URL auto-redirects.
- **Netlify:** re-link each stray site into the surviving team
  (**Add new site → Import from Git → RenuviaMD/<repo>**), copy build settings +
  **all env vars by hand**, re-create deploy hooks/webhooks, move the domain LAST.

---

## Division of labor (how to actually use it)

| Work | Use |
|---|---|
| Cross-repo, cross-Netlify, "handle everything," deploys | **Mac Claude** (`~/RenuviaMD/`) |
| Focused single-line task, working from phone/iPad, safe sandbox | **Web Claude** (scoped env) |
| Repo → product → keep/merge/archive triage | **Mac Claude first** (needs to see inside all repos) |

---

## Top-level CLAUDE.md template for ~/RenuviaMD/

```md
# RenuviaMD — Operations Root

Three product lines, each tiered simple → deep. Map repos to lines before editing.

## Line A — Medical Director (B2B governance)
Public site (myfloridamedicaldirector.com) → AHCA Pro (works) → MD Console (non-AHCA, WIP).
Repos: AHCAClinicPortal, medical-director-console, renuviamd-os-prototype, AHCAAuditPro, bioaxis(?)

## Line B — PIP Direct Care (MAIN income; B2B + paper CMS-1500 to AUTO insurers)
PI Notes (note maker) → PI Master (moderate, polishing) → Full SaaS (clinic docs +
attorney/litigation package, EOY).
Repos: PIP-notes-, PI-Master-, InjuryOS(?), floridapipdoctor(?), PI-Master-, fl_pi_hunter

## Line C — Peptides (B2B practice setup; physician + admin managed)
Peptides page (done) → Peptide Practice OS (pending restructure).
Repos: renuviamd-site, (peptide OS repo TBD)

## Marketing (evaluate one-by-one; focus PIP, B2B clinics, spa/wellness)
renuviamd-campaign-engine, lead-engine, renuviamd-shopify-theme, renuviamd-network, renuviamd-gate

## Rules
- No marketing of patient care. Business is B2B with the clinic.
- No direct health-insurance billing. PIP only: paper CMS-1500 to auto carriers.
- Confirm canonical repo per tier before building; archive duplicates, don't delete.
```
