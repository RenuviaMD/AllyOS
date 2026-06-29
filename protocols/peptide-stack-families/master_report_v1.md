# Peptide Stack Family Master Architecture v1

**Date updated:** 2026-06-29  
**Purpose:** simplified non-overlapping selector architecture for peptide wellness stacks.

## New clean workflow

1. Client chooses wellness goal.
2. AI selects **one stack family**.
3. Provider chooses **2-, 3-, or 4-peptide build** inside that family.
4. AI runs safety gates.
5. If clear, AI matches IV/IM support ingredient groups.
6. Output must use evidence-graded wellness language and avoid disease-treatment or peptide-potentiation claims.

## The 9 stack families

| Family | Goal | 2 / 3 / 4 build concept |
|---|---|---|
| FAM01 Metabolic / GLP | weight, appetite, metabolic wellness | GLP/GIP anchor + MOTS-c/amylin/AOD options |
| FAM02 GH / Recovery | recovery, lean support | sermorelin/CJC/tesamorelin + ipamorelin/GHRP options |
| FAM03 Mitochondrial / Energy | energy, fatigue, longevity | MOTS-c + SS-31 ± Epitalon ± Humanin |
| FAM04 Repair / Connective | tendon, joint, recovery | BPC-157 + TB-500 ± KPV ± thymosin beta-4 |
| FAM05 Skin / Hair / Glow | skin, hair, nails | GHK-Cu + aesthetic peptide options |
| FAM06 Sexual / HPG | libido, vitality | PT-141 + kisspeptin ± oxytocin ± gonadorelin |
| FAM07 Neuro / Calm / Sleep | focus, calm, sleep | Semax + Selank ± DSIP ± Cerebrolysin |
| FAM08 Immune / Inflammatory | immune wellness | TA-1 + LL-37 ± thymulin ± tuftsin |
| FAM09 Non-GLP Metabolic | body composition | AOD-9604 + tesamorelin/MOTS-c/ipamorelin options |

## Important design correction

Deficiency is **not required** for wellness matching. A client goal such as energy, hair, glow, libido, recovery, or body composition can trigger the support path. Deficiency/lab abnormality/low intake increases confidence, but does not determine eligibility by itself.

## Safety-first rule

Safety gates run before IV/IM selection. If a hard stop fires, do not infuse.

## Files

- `peptide_stack_family_master_v1.jsonl`
- `peptide_stack_family_master_v1.csv`
- `peptide_stack_family_iv_im_match_v1.jsonl`
- `peptide_stack_family_iv_im_match_v1.csv`
- `peptide_stack_selector_logic_v1.jsonl`
- `peptide_stack_family_safety_gate_map_v1.jsonl`
- `peptide_stack_family_source_audit_v1.csv`
- `peptide_stack_family_validation_cases_v1.csv`
- `peptide_stack_family_master_report_v1.md`
- `peptide_stack_family_master_manifest_v1.json`
- `peptide_stack_family_master_package_v1.zip`
