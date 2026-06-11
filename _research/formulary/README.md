# BioaxisOS Formulary

Build-time import source for the BioaxisOS Protocol Designer. Each `.md` file is a
Prescribing Card: YAML frontmatter (structured, machine-readable) + a 7-section
markdown body (human-readable).

## Structure

- `_individuals/` — 22 single-agent peptide cards
- `_stacks/` — 7 composite stack cards (contraindications = union of components)

## Frontmatter contract

```yaml
slug: kebab-case            # unique id, matches filename
name: string                # generic name primary
brand_names: [list]         # may be empty
axis: Longevity | Growth | Metabolism | Repair | Cognition | Immunity | Vitality
status: fda_approved | off_label | investigational | not_approved
controlled: false
pricing:
  trial: { usd, duration_weeks, cogs_usd }
  full:  { usd, duration_weeks, cogs_usd }
popup_summary:
  mechanism: string          # one line
  primary_use: string        # one line
  contraindications_short: string  # one line, comma-separated
  clinical_notes_short: string     # 2-3 sentences
document_meta: { author, version, last_clinical_review }
```

## Body sections (fixed order)

1. Indication
2. Rule out (contraindications) — checkbox list
3. Rx — dose / route / reconstitution / cycle / stack pairs
4. Labs (baseline) — with `← gating` markers
5. Ongoing care — Wk 2 / Mo 1 / Mo 3 / Mo 6 table
6. Safety & compliance gate — checkbox list
7. Patient education key points

## Status honesty

Only Tirzepatide, Tesamorelin, and Bremelanotide (PT-141/Vyleesi) are `fda_approved`.
Sermorelin is `off_label` (brand discontinued, compounded). Everything else is
`investigational` or `not_approved`. Cards flag thin/absent human evidence inline
with `<!-- NOTE: -->`. No fabricated trial citations are present.

## Verification notes (carried from clinical review)

- Reconstitution math verified per card (mg/mL → mcg/mL → volume → U-100 units).
- `growth-stack` is Sermorelin + Ipamorelin (one GHRH + one GHRP); the earlier
  three-peptide version with redundant dual-GHRH was dropped.
- `semax` / `selank` are dosed SC here; native peptides are short-acting and
  conventionally intranasal — N-acetyl/amidated analogs are more stable for SC.
- Empiric (non-validated) SC dosing: `mots-c`, `ss-31`, `epitalon`, `kisspeptin-10`.
