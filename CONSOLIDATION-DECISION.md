# RenuviaMD — Consolidation Decision

_Date: 2026-06-21 · Source: portfolio audit of 21 repos (`~/RenuviaMD/CONSOLIDATION-AUDIT.md`)_

## Operating principle: FIVE ROLES, not "businesses"

Structure is organized by the **physician role (hat)** Falcon wears, because each
role has different standing and a different platform family. The critical split:

- **Medical Director** = governance/oversight (supervises a clinic).
- **Direct Care Provider** = treating physician (sees and bills the patient).
  CAN be done in a clinic where Falcon is NOT the medical director.

These two roles stay **structurally separate**. `PI Master` is a Direct-Care
platform ONLY — never a governance platform.

| # | Role (hat) | What he does | Platform(s) | Billing |
|---|---|---|---|---|
| **1** | **Medical Director** | Govern AHCA + non-AHCA clinics | `AHCAClinicPortal` (shell/public), `AHCAAuditPro` (AHCA governance — "works"), `medical-director-console` (non-AHCA ops + protocol library) | B2B retainer |
| **2** | **Direct Care Provider** | Treat PIP/accident patients himself | `PIP-notes-` (lite), **`PI Master`** (workhorse), `InjuryOS` (full SaaS), `floridapipdoctor` (landing), `fl_pi_hunter` (attorney leads) | **B2B preferred + direct CMS-1500 to auto carriers** |
| **3** | **Platform Vendor** | License line-of-care OS to clinics; bioaxis = template | `bioaxis` (peptides), `renuviamd-medical` (GLP/BHRT) | License/SaaS to practice |
| **4** | **Principal Investigator** | PI for research sites | `research-renuviamd` → research.renuviamd.com | Site/PI income |
| **5** | **Product / D2C** | Sell GLP-Balance supplement | Shopify **done** (shop.renuviamd.com), Amazon **half-built**, `renuviamd-campaign-engine` | D2C retail |

### Structural rule: keep governance OUT of PI Master
The `claude/sweet-volta-9jzzv5` branch bolted an "AHCA Pro feeder" onto PI Master.
That couples Role 1 into Role 2. **Decouple it:** PI Master runs standalone
(direct-care docs + CMS-1500 billing). Governance is an **extra module that
applies ONLY when the same physician is both the clinic's medical director AND a
treating MD there** (Roles 1 + 2 on the same clinic). Default OFF; switch it on
only for that overlap case.

### PI Master canonical home (fork to resolve)
The strongest PI Master frontend currently lives on branch
`claude/sweet-volta-9jzzv5` inside `renuviamd-site` (the *peptides* repo) as
`app-pimaster/` — tested, with CMS-1500/Superbill, telehealth, EMC, clone-guard.
There is also `RenuviaMD/PI-Master-` in the org; both target the same Supabase
project `pi-master` (ref `fkwqzmnqflmkchiszxub`). **Pick ONE canonical frontend
(likely the sweet-volta build) and move it to its own repo in the org** — do not
leave the direct-care platform homed inside the peptides repo, and do not run two
frontends against one database.

## Decisions per repo

### KEEP — canonical (7 active + 2 specialized)
- A: `AHCAClinicPortal`, `AHCAAuditPro`, `medical-director-console`
- B: `PIP-notes-`, `PI-Master-`, `InjuryOS` (+ `floridapipdoctor`, `fl_pi_hunter` as B-marketing)
- C: `bioaxis`, `renuviamd-medical`
- D: `research-renuviamd`

### MERGE → then ARCHIVE (4 — no loss)
| Archive | Salvage into | Note |
|---|---|---|
| `renuviamd-gate` | `medical-director-console` | same non-AHCA clearance job |
| `renuviamd-network` | `AHCAClinicPortal` | duplicate public face |
| `renuviamd-os-prototype` | `InjuryOS` | salvage GFE / Doxy / Postgres, then kill 663KB god-component |
| `bhrt-intake` | `bioaxis` | bioaxis already has intake/quiz |

### REPOSITION (the pivot — refactor, don't archive)
- `renuviamd-medical`: strip "RenuviaMD delivers care to patients" framing →
  "your practice runs GLP-1/BHRT on this platform." Stripe = the clinic's
  billing, not RenuviaMD's. Becomes Line C product #2 alongside bioaxis.
- **GLP-Balance (Role 5 — ACTIVE, ship this week):** Shopify storefront DONE at
  `shop.renuviamd.com`; Amazon store **half-built** — finish it. `campaign-engine`
  = the creative/ad engine. This is a committed D2C line, not frozen.

### RELOCATE (not RenuviaMD)
- `rosy-proclean-`, `rosy-proclean-engine`, `rosyproclean-site` → transfer to a
  new dedicated org (e.g. `RosyProClean`). Separate cleaning business, zero
  medical overlap.

## Feature requirement captured
- **PI-Master- / InjuryOS billing:** must generate **CMS-1500** and submit
  **paper/fax to auto (PIP) carriers** — B2B payment stays primary. No health-
  insurer EDI / clearinghouse needed for the core flow.

## Focus order (capacity ceiling: 10–12 clinics; PIP = main income)
1. **PIP spine** — `PI-Master-` now (workhorse), `InjuryOS` for EOY SaaS.
   Long-term: `PIP-notes-` = free funnel, fold `PI-Master-` into `InjuryOS`.
2. **MD governance** — `AHCAAuditPro` + `medical-director-console`.
3. **Line C platforms** — productize `bioaxis` first (template), then `renuviamd-medical`.
4. **Line D research** — maintain; lowest active dev.
5. Everything else frozen until 1–2 produce.

## Executable steps (run from ~/RenuviaMD with gh authed as RenuviaMD)

```bash
# 1. Archive the 4 duplicates AFTER salvaging code (do salvage first!)
gh repo archive RenuviaMD/renuviamd-gate
gh repo archive RenuviaMD/renuviamd-network
gh repo archive RenuviaMD/renuviamd-os-prototype
gh repo archive RenuviaMD/bhrt-intake

# 2. Relocate the cleaning business (create the org on github.com first, then):
#    GitHub web → each repo → Settings → Danger Zone → Transfer → owner: RosyProClean
#    (gh has no stable transfer subcommand; use the web UI or `gh api`)

# 3. Bring the peptide-reference repo into the org (consolidation):
#    Transfer armandofalcon66/renuviamd-site → RenuviaMD via web UI, then it
#    clones with this same login.
```

> Do salvage commits BEFORE `gh repo archive` (archived repos are read-only).
