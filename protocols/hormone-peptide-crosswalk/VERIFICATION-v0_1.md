# Hormone × Peptide Crosswalk v0.1 — AllyOS audit record

Date: 2026-06-30 · Auditor: AllyOS (PubMed live verification) · Package: hormone_peptide_crosswalk_package_v0_1
All 8 files SHA-256-verified against the manifest. Original files unchanged (this is an additive audit record).

## What this layer is
A **provider-facing recommendation layer** that sits ABOVE the BHRT/MHT module, the men's hormone-optimization
module, and the peptide stack master. It does not replace them. Given a hormone/wellness phenotype it answers:
which peptide stack family is most aligned, which IV/IM support fits, and which claims must be avoided.
`no_dosing_logic: true`, `no_regulatory_logic: true`, `auto_recommendation_allowed: false`, `provider_review_required: true`.
Order of operations is fixed: **hormone safety gates first → peptide safety gates second → then present provider-review options.**

## Source audit — external evidence anchors (resolve each yourself to confirm)
According to PubMed:

| source_id | Verified ID | Verdict |
|---|---|---|
| SRC_GLOBAL_T_WOMEN_2019 — Global Consensus Position Statement on the Use of Testosterone Therapy for Women (Davis SR et al., 2019) | PMID 31498871 · JCEM 2019;104(10):4660-4666 · DOI 10.1210/jc.2019-01603. Simultaneously published: J Sex Med PMID 31488288 (DOI 10.1016/j.jsxm.2019.07.012); Maturitas PMID 31484631 (DOI 10.1016/j.maturitas.2019.07.001); Climacteric PMID 31474158 (DOI 10.1080/13697137.2019.1637079) | ✅ VERIFIED — endorsed by IMS, Endocrine Society, NAMS, ISSWSH, et al. MeSH includes "Off-Label Use," "Postmenopause." Conclusion exactly supports the crosswalk's female-testosterone guardrail: **the only evidence-based indication is postmenopausal HSDD after biopsychosocial assessment; NOT for energy/mood/cognition/weight loss.** (HPX_003) |
| SRC_NAMS_2022_HT — NAMS 2022 Hormone Therapy Position Statement | PMID 35797481 (verified in prior packages) | ✅ VERIFIED — anchors HPX_001/004/005 menopause safety gates. |
| SRC_ENDOCRINE_MEN_T_2018 — Endocrine Society testosterone CPG (Bhasin, JCEM 2018) | PMID 29562364 · DOI 10.1210/jc.2018-00229 | ✅ VERIFIED — men's eligibility/safety (HPX_006–010). |
| SRC_AUA_TD — AUA Testosterone Deficiency Guideline (Mulhall, J Urol 2018) | PMID 29601923 · DOI 10.1016/j.juro.2018.03.115 | ✅ VERIFIED — TT <300 ng/dL + symptoms diagnostic support (HPX_006). |
| SRC_ACP_LOW_T_2020 — ACP age-related low-T CPG (Qaseem, Ann Intern Med 2020) | PMID 31905405 · DOI 10.7326/M19-0882 | ✅ VERIFIED — against T for energy/vitality/cognition (HPX_007/008/012). |
| SRC_FDA_T_2025 / SRC_HHS_T_2026 — testosterone label/CV/prostate context | regulatory, not indexed | ⚠️ Advisory context only — NOT gates (file states this). Verify against the live FDA/HHS source at lock. |

## Internal references (NOT external evidence — correctly labeled as structure only)
- `SRC_PEPTIDE_STACK_FAMILIES` (peptide_stack_family_master_v1.jsonl) — his own peptide CDS. The source-audit row
  honestly states it **"does not prove clinical outcomes or hormone synergy."** ✓
- `SRC_UPLOAD_DEMATOS_BHRT`, `SRC_UPLOAD_SULEIKA_MHT` — his own patient PDFs, used as document-design structure
  references only; the audit flags they "do not establish external evidence." ✓

## Posture check (all pass)
- **No fabricated source.** Every external citation resolves; the one new anchor (Davis 2019) is verified across all
  four simultaneous journal publications.
- **No synergy claim.** The do-not-claim list and the four language guardrails block exactly the dangerous claims:
  "BHRT/TRT + peptides synergistic," "peptides treat menopause / low-T / ED / depression / osteoporosis / diabetes,"
  and any `mg/mL/dose` text (HPX_LANG_NO_DOSING). ✓
- **No automatic stacking.** HPX_LANG_NO_AUTOMATIC_STACKING requires phenotype match + safety clearance + provider
  review before any peptide option is presented. Matches your "no push, not commercial, provider decides" rule. ✓
- **Hormone-gates-first ordering** is explicit in the selector logic and the report. ✓
- **10 validation cases** encode the right hard stops (chest pain → full stop; active bleeding → hold; fertility →
  no auto-TRT; OSA → no neuro-peptide-as-treatment; fever/hypoxia → no immune claim; dosing request → route to locked
  standing order). ✓

## One context note for the MD (not a gate — info only, consistent with no_regulatory_logic)
Among the named peptides, **PT-141 / bremelanotide (Vyleesi)** is FDA-approved (premenopausal HSDD). Most others
(MOTS-c, SS-31, BPC-157, TB-500, Epitalon, injectable GHK-Cu, kisspeptin, sermorelin/ipamorelin/CJC/tesamorelin,
Semax/Selank/DSIP, thymosin-α1/LL-37) are **non-FDA-approved / compounded research peptides**; several (e.g. BPC-157)
have appeared on FDA 503A bulk-compounding "difficult to compound" review lists. The crosswalk already handles this
correctly by framing every peptide as a **provider-decision wellness option with no disease-treatment claim** and routing
dosing to your locked protocol. Surfacing it here only so the provider sees the regulatory texture — it is the
provider's clinical + compliance call and signature, never AllyOS's.

**Status: VERIFIED — ready to transcribe into a DRAFT AllyOS cross-line adjunct layer, pending Medical-Director (Falcon, MD)
sign-off before it goes live to any clinic.** No fabricated source; 5 guideline/consensus anchors verified (1 new: Davis 2019,
verified ×4 journals), internal references correctly labeled non-evidentiary, guardrails sound.
