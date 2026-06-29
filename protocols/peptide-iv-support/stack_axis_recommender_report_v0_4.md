# Peptide Stack → Axis → IV Support Recommender v0.4

**Date updated:** 2026-06-28  
**Purpose:** Answer provider questions like:  
> “My patient is on retatrutide + tesamorelin/ipamorelin + MOTS-c. Is there anything IV that can help?”

## Correct logic

The AI must not start from a generic IV menu. It must start from the active peptide stack:

1. Identify active peptides.
2. Map each peptide to a physiologic axis.
3. Detect patient-factor triggers.
4. Recommend IV support only when a trigger exists.
5. Attach evidence grade and “do not claim” language.
6. Route to a specific standing order only after provider selects an IV option.

## Example stack

**Retatrutide + Tesamorelin/Ipamorelin + MOTS-c**

Detected axes:

- Retatrutide → metabolic incretin / glucagon axis.
- Tesamorelin + ipamorelin → GH / IGF-1 / recovery axis.
- MOTS-c → mitochondrial / AMPK / NAD-support research axis.

## Output for the example stack

Most defensible IV support is not “peptide enhancement.” It is trigger-based:

1. **Hydration / Electrolyte IV** — if nausea, vomiting, diarrhea, orthostasis, constipation with low fluid intake, low intake, heat exposure, or dehydration risk.
2. **B12 / B-complex / Myers-type support** — if reduced intake, fatigue with deficiency risk, metformin/PPI use, vegan diet, post-bariatric history, macrocytosis, or neuropathy.
3. **Amino Blend / Fast Recovery IV** — if low protein intake, high training load, poor recovery, sarcopenia risk, or wound-repair nutrition context.
4. **Niagen/NR IV or NAD+ IV** — only as provider-reviewed mitochondrial/NAD-pathway support; no direct MOTS-c combination evidence.
5. **Glutathione IV push** — antioxidant support only when oxidative-stress context exists; no peptide-synergy claim.

## Hard guardrail

If the only input is “patient is on peptides” and there is no symptom, nutrition, lab, or axis-specific trigger, the answer is:

> “No IV support is automatically indicated from the peptide stack alone. Consider IV support only if a patient-factor trigger is present.”

## Files

- `peptide_axis_iv_support_profiles_v0_4.jsonl`
- `peptide_stack_iv_support_recommender_v0_4.jsonl`
- `peptide_stack_iv_support_recommender_v0_4.csv`
- `peptide_axis_iv_guardrails_v0_4.jsonl`
- `peptide_axis_iv_source_audit_v0_4.csv`
- `peptide_axis_iv_validation_cases_v0_4.csv`
- `peptide_axis_iv_recommender_report_v0_4.md`
- `peptide_axis_iv_manifest_v0_4.json`
