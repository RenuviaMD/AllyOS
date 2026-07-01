# Hormone Optimization × Peptide Stack Recommendation Crosswalk v0.1

**Date updated:** 2026-06-30  
**Scope:** Crosswalk between women’s BHRT/MHT, men’s testosterone-centered wellness HRT, and the peptide stack families previously designed.  
**Use:** Provider-facing recommendation layer.  
**No dosing:** yes.  
**No regulatory-status logic:** yes.  
**Core safety rule:** Hormone safety gates run first. Peptide safety gates run second. Then the system may present provider-review peptide options.

## Purpose

This layer does not replace the BHRT/MHT module, the men’s hormone optimization module, or the peptide stack master. It sits above them and answers:

> “Given the patient’s hormone/wellness phenotype, which peptide stack family is most aligned, what IV/IM support fits, and what claims must be avoided?”

## High-level matching

| Hormone/wellness phenotype | Peptide family option | Comment |
|---|---|---|
| Menopause energy/fatigue/brain fog | FAM03 Mitochondrial / Energy | Axis-aligned only; no anti-aging or BHRT synergy claim. |
| Menopause skin/hair/glow | FAM05 Skin / Hair / Glow | Strong aesthetic fit; monitor biotin labs and androgenic effects if testosterone used. |
| Postmenopausal HSDD | FAM06 Sexual / HPG | Caution. HSDD/GSM/BP gate first. Testosterone in women only for postmenopausal HSDD after assessment. |
| Menopause metabolic/body composition | FAM01 GLP / Metabolic | Protein/resistance training and GLP safety gates are central. |
| Menopause recovery/bone/muscle | FAM02 GH / Recovery | High caution. Do not claim osteoporosis treatment or GH-BHRT synergy. |
| Men’s libido/sexual vitality | FAM06 Sexual / HPG | Not first-line ED care. Fertility, BP/CV, prostate and medication gates first. |
| Men’s metabolic/body composition | FAM01 GLP / Metabolic | Strong phenotype fit if metabolic criteria present; no TRT+GLP synergy claim. |
| Men’s energy/recovery/longevity | FAM03 Mitochondrial / Energy | Fatigue differential, OSA, BP/CV, Hct gates first. |
| Men’s strength/recovery with TRT | FAM02 GH / Recovery | High caution due endocrine stacking, IGF/glucose/edema/OSA gates. |
| All hormone patients with joint/repair concerns | FAM04 Repair / Connective | Provider review; no healing guarantee. |
| All hormone patients with mood/sleep/focus | FAM07 Neuro / Calm / Sleep | Do not treat psychiatric/sleep disorders; OSA/mental-health gate first. |
| All hormone patients with immune concerns | FAM08 Immune / Inflammatory | Active infection red flags first; no infection-treatment claim. |

## Review logic

1. Determine population: women_menopause_BHRT or men_hormone_optimization.
2. Determine dominant wellness goal.
3. Run hormone module safety gates.
4. Run peptide module safety gates.
5. Select one peptide family option.
6. Attach IV/IM support if cleared.
7. Output recommendation tier and do-not-claim language.
8. Route high-caution cases to provider review.

## Critical do-not-claim list

- “BHRT + peptides are synergistic.”
- “TRT + peptides are synergistic.”
- “Peptides treat menopause.”
- “Peptides treat low testosterone.”
- “Peptides replace testosterone.”
- “GH peptides treat osteoporosis.”
- “TRT + GLP guarantees fat loss.”
- “Peptides treat ED, depression, insomnia, infection, diabetes, dementia, or cardiovascular disease.”

## Evidence posture

The uploaded women’s BHRT documents are used as internal structure references for strong patient-facing and provider-facing document design. External evidence anchors support the hormone safety gates and claim limitations.
