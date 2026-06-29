# Peptide ↔ IV support layer — STAGING (not yet locked)

**Status:** DRAFT / staging. Two provider-supplied packages consolidated here, reconciled against the locked `iv-module`, pending the 3-auditor lock + Medical Director sign-off.

## What this layer is (and is NOT)
This is the **matching + claim-discipline** layer for pairing IV ingredients/options with peptide therapy. It is **wellness-elective**: a healthy client's *goal* (energy, glow, recovery) can trigger a match — **deficiency is not required**. The provider's role is **safety + contraindication rule-out**, not treating a disease.

It is **NOT** a second safety layer. **Safety is delegated to the locked `iv-module`** (ceilings, compatibility matrix, the 39-ingredient screen). This layer only adds what the iv-module lacks: wellness-goal/axis matching, evidence labels (W2/W3/W4), and the `do_not_claim` honesty guardrails.

## Two packages
- **v0.4 — stack-level** (`stack_*`): active peptide stack → physiologic axis → patient trigger → ranked IV *support option* → evidence grade → guardrails. Example stack: retatrutide + tesamorelin/ipamorelin + MOTS-c.
- **v0.1 — ingredient-level** (`ingredient_*`): 17 IV ingredients → wellness goal + peptide axis → role → `fires_when` → `hard_stop_or_gate` → `do_not_claim` → evidence label. Wellness-goal-triggered, deficiency optional.

They nest: **client goal → axis → option (v0.4) → ingredient (v0.1)**, all wellness-elective + safety-gated.

## Guardrails (combined, 7)
Wellness-goal-allowed · safety-gate-FIRST · no-peptide-potentiation · patient-trigger (v0.4) · Niagen-distinct · no-doses (routes to locked standing order) · no-regulatory-logic.

## Safety delegation map — ingredient → locked iv-module screen
The package's per-ingredient gates were reconciled against `ingredient-screening-contraindications.json` + `iv-module` ceilings/compatibility. **Zero conflicts.** Safety pulls from the locked IDs below; the package does not re-state it.

| Package ingredient | Locked ID | Reconciliation |
|---|---|---|
| 0.9% saline / hydration | `ING_NS` | agree |
| B-complex | `ING_VITACOMPLEX` | agree (methyl-B12 only) |
| Methylcobalamin / B12 | `ING_METHYLB12` | agree (Leber's CI) |
| NAD+ IV | `ING_NAD` | agree (ceiling 500 mg, dedicated bag) |
| Niagen / NR | `ING_NIAGEN_NR` | agree — **DRAFT; clinical use needs the clinic Medical Director's standing order** |
| Glutathione | `ING_GLUTATHIONE` | agree (push-only, asthma/sulfite, not in Vit C bag) |
| Vitamin C | `ING_VITC` | agree (G6PD >2 g / CARD-VC ≥6 g, oxalate/CKD, stones) |
| Biotin | `ING_BIOTIN` | agree (troponin/TSH lab interference; hold before labs) |
| Magnesium | `ING_MGCL` | agree (renal, AV block, myasthenia); **extend: add hypotension** |
| Amino blend | `ING_AMINOBLEND` | agree |
| L-carnitine | `ING_CARNITINE` | agree |
| Taurine | `ING_TAURINE` | agree |
| MIC / lipotropic | `ING_LIPOTROPIC` / `ING_MICC` | agree |
| Zinc / trace | `ING_ZINC` / `ING_TRACE` / `ING_SELENIUM` | agree (copper/Mn accumulation) |
| CoQ10 | `ING_COQ10` | agree (warfarin); **extend: explicit "IM only — no oil-based IV"** |
| NAC | `ING_NAC` | agree |
| Vitamin D3 | `ING_VITD3` | agree |

**Extensions to add to the locked screen at re-lock:** CoQ10 explicit no-IV-route · Magnesium hypotension · confirm Vit C hemochromatosis/iron-overload note.

## Ceilings (enforced at the locked standing order, not here)
NAD+ 500 mg · Glutathione 1,200 mg (push) · Vitamin C 10 g (CARD-VC) · Magnesium 2 g · Biotin 10 mg · Calcium 1 g · B-complex 2 mL · Methyl-B12 5,000 mcg · Amino 10 mL. The packages carry **no doses** — they route to the locked standing order, which enforces these.

## Open fixes before lock
1. Niagen status line (published reference; clinical use = clinic MD standing order).
2. Tighten "detox" domain labels → "redox/antioxidant support."
3. CoQ10 IM-only (no IV SKU).
4. Resolve the "Metabolic Stack" naming collision (workspace GH/mito vs commercial GLP-1+adjunct).
5. Add the Repair Stack (BPC-157 + TB-500 + GHK-Cu) and assign orphan peptides.

## To lock
Consolidate v0.4 + v0.1 into a single `peptide-iv-support` module that **references the locked iv-module IDs for safety**, apply the open fixes, add the wellness-elective posture line, then run the 3-auditor lock + MD sign-off — same process as the IV/BHRT/peptide modules.
