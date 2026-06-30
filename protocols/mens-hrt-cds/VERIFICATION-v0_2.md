# Men's HRT CDS — citation verification (AllyOS audit)

Date: 2026-06-30 · Auditor: AllyOS (PubMed + ClinicalTrials live verification) · Package: mens_hrt_cds_package_v0_1
All 7 source files SHA-256-verified against the manifest. Original files unchanged (this is an additive audit record).

## Source audit — verified IDs (resolve each yourself to confirm)
| source_id | Title | Verified ID | Verdict |
|---|---|---|---|
| SRC_ENDOCRINE_MALE_T_2018 | Testosterone Therapy in Men With Hypogonadism: Endocrine Society CPG (Bhasin, JCEM 2018;103:1715-1744) | PMID 29562364 · DOI 10.1210/jc.2018-00229 | ✅ VERIFIED — supports the symptoms+repeat-low-morning-T framework and the full hard-stop set |
| SRC_AUA_TESTOSTERONE_DEFICIENCY | Evaluation and Management of Testosterone Deficiency: AUA Guideline (Mulhall, J Urol 2018;200:423-432) | PMID 29601923 · DOI 10.1016/j.juro.2018.03.115 | ✅ VERIFIED — total T <300 ng/dL + symptoms + repeat |
| SRC_ACP_AGE_RELATED_LOW_T_2020 | Testosterone Treatment in Men With Age-Related Low T: ACP CPG (Qaseem, Ann Intern Med 2020;172:126-133) | PMID 31905405 · DOI 10.7326/M19-0882 | ✅ VERIFIED — T only for sexual dysfunction; against energy/vitality/physical/cognition |
| SRC_AUA_ASRM_INFERTILITY | Diagnosis and treatment of infertility in men: AUA/ASRM Guideline Part II (Schlegel, Fertil Steril 2020;115:62-69) | PMID 33309061 (Part I: 33309062) · DOI 10.1016/j.fertnstert.2020.11.016 | ✅ VERIFIED — exogenous T suppresses spermatogenesis → fertility gate |
| SRC_FDA_TESTOSTERONE_LABEL_2025 | FDA class-wide testosterone labeling (BP warning); underlying CV evidence = TRAVERSE | TRAVERSE PMID 37326322 · DOI 10.1056/NEJMoa2215025 (NEJM 2023;389:107-117) | ✅ Peer-reviewed evidence VERIFIED. Verify the FDA label-page text itself at lock. |
| SRC_HHS_TESTOSTERONE_LABEL_2026 | HHS/FDA 2026 requested testosterone label updates | — (regulatory, not indexed) | ⚠️ VERIFY-AT-LOCK against the live HHS/FDA source. Advisory context only — NOT a gate (file already states this). |

## One accuracy note for the MD (grounded in the verified TRAVERSE source)
TRAVERSE (PMID 37326322) found TRT **noninferior for MACE**, but a **higher incidence of atrial fibrillation, pulmonary embolism, and acute kidney injury** in the testosterone arm. The package's CV/VTE gate (MEN_GATE_005) and monitoring module (MENHRT_010) are consistent with this, but consider explicitly adding **AFib / PE / AKI** to the monitoring + CV-counseling language so the module reflects the exact finding of its own cited trial. (Suggestion only — clinical call + sign-off is the MD's.)

## Posture check (all pass)
- `no_dosing_logic: true` — confirmed; the MEN_LANG_NO_DOSING guardrail blocks mg/mL; doses route to the locked provider protocol. ✓
- `no_regulatory_logic: true` — confirmed; FDA/HHS items are advisory context, not gates. ✓
- Wellness-goal-can-trigger-evaluation but **not** auto-TRT (diagnostic gate) — confirmed and guideline-grounded (Endocrine/AUA/ACP). ✓

**Status: ready to transcribe into the AllyOS locked-module format as a DRAFT, pending Medical-Director (Falcon, MD) sign-off.** No fabricated source found; 5 peer-reviewed/guideline citations verified, 1 regulatory item correctly flagged advisory.
