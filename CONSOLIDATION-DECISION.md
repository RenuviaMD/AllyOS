# RenuviaMD — Consolidation Decision

_Date: 2026-06-21 · Source: portfolio audit of 21 repos (`~/RenuviaMD/CONSOLIDATION-AUDIT.md`)_

## Operating principle (the rule that resolves everything)

**No patient/consumer marketing. Every patient-facing platform is sold to a
practice as its operating platform — the clinic faces the patient, RenuviaMD
faces the clinic.** `bioaxis` is the reference implementation of this pattern.

## Four income lines

| Line | Definition | Canonical repos | Billing model |
|---|---|---|---|
| **A — Medical Director** | Governance/oversight provided to clinics | `AHCAClinicPortal` (shell/public), `AHCAAuditPro` (AHCA engine — "works"), `medical-director-console` (non-AHCA ops + protocol library) | B2B retainer |
| **B — PIP Direct Care** | Falcon's own clinical work in accident clinics | `PIP-notes-` (T1 lite), `PI-Master-` (T2, active workhorse), `InjuryOS` (T3 full SaaS, EOY), `floridapipdoctor` (B2B landing), `fl_pi_hunter` (attorney sourcing) | **B2B preferred + direct paper CMS-1500 to auto/PIP carriers** |
| **C — Practice Operating Platforms** | Line-of-care platforms SOLD to clinics; bioaxis = template | `bioaxis` (peptides — the example), `renuviamd-medical` (GLP-1/BHRT → repackage as sellable practice platform) | License / SaaS to practice |
| **D — Research / PI** | Falcon as Principal Investigator for research sites | `research-renuviamd` | Site/PI income |

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
- **GLP-Balance assets** (`renuviamd-campaign-engine`, `renuviamd-shopify-theme`,
  `lead-engine`): the campaign engine (ad-copy/avatar generator) → repackage as a
  B2B **practice-marketing module**. The D2C supplement Shopify store →
  **FREEZE** unless it is currently producing revenue (decide).

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
