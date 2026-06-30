# Men's TRT dosing — sign-off sheet (v0.1 DRAFT)

For: Armando A. Falcon, MD — Medical Director, RenuviaMD® / AllyOS
Prepared by: AllyOS audit (PubMed live verification) · 2026-06-30
Scope: the testosterone starting regimens now emitted by `allyos/mens-poc.html` (shown ONLY on the
candidate-review eligibility path; engine proposes, provider titrates to mid-normal & signs).

According to PubMed, the anchor guideline is verified: **Testosterone Therapy in Men With Hypogonadism —
Endocrine Society CPG** (Bhasin et al., JCEM 2018;103:1715-1744), PMID 29562364, [DOI](https://doi.org/10.1210/jc.2018-00229).

## What the tool prints (candidate path only) → grounding → verdict

| Item | What it prints | Grounding | Verdict |
|---|---|---|---|
| **Principle** | Aim for **mid-normal total testosterone** with any approved formulation; engine proposes, provider titrates & signs | Endocrine Society 2018 abstract states verbatim: "aim at achieving T concentrations in the mid-normal range during treatment with any of the approved formulations." | ✅ verified |
| **Injectable** | Testosterone cypionate/enanthate IM or SC, **start ≈100 mg weekly** (or 200 mg q2wk); weekly/SC = steadier, less erythrocytosis; check **trough** total T at ~6 wk; target **~400–700 ng/dL** | FDA cypionate (Depo-Testosterone) label + guideline practice. Weekly/SC vs q2wk and the 400–700 numeric window are conventional targets, not a verbatim guideline number. | ✅ standard; **confirm window** (see Q1) |
| **Transdermal gel** | **1.62% start 40.5 mg/day** (range 20.25–81 mg) or 1% gel 50–100 mg/day; apply shoulders/upper arms, wash hands, cover site; **FDA secondary-exposure warning** (no skin transfer to women/children); check T ≥1 wk after start | FDA AndroGel 1.62% / 1% labels (dose + transfer warning are label-level). | ✅ verified · VERIFY-AT-LOCK vs current product label |
| **Monitoring** | Total T + **hematocrit** + symptoms at **baseline, 3–6 mo, then annually**; **Hct >54% → stop** until normal, evaluate OSA/hypoxia, restart reduced; **PSA/prostate** within 3–12 mo then per screening; BP (TRAVERSE) | Endocrine Society 2018 (monitoring plan + Hct>54% stop + first-year prostate assessment); FDA 2025 class-wide BP labeling; AUA TD. | ✅ verified |
| **Guardrails** | Schedule III — provider's own DEA/state authority; not for energy/anti-aging/fat-loss/diabetes; compounded/pellets no automatic superiority; fertility suppression note | Controlled Substances Act (T = Schedule III); ACP 2020 (PMID 31905405) wellness-claim guardrail; AUA/ASRM fertility. | ✅ verified |

## Decisions for your initials
- **Q1 — trough target window.** I used **mid-normal ~400–700 ng/dL**. Your assay's normal range may differ; confirm the numeric window or say "mid-normal per lab range." ☐ approve ☐ set to ______
- **Q2 — injection default.** I defaulted to **~100 mg weekly (or 200 mg q2wk), IM or SC**. Confirm your house default (weekly SC vs q2wk IM). ☐ approve ☐ set to ______
- **Q3 — gel product.** I named **1.62% (start 40.5 mg)** and **1% (50–100 mg)** generically. Confirm or pin to your formulary product. ☐ approve ☐ set to ______
- **Q4 — pellets/nasal.** Not included (kept the two routes you asked for: injectable + transdermal). Add pellets/nasal later? ☐ keep as-is ☐ add later
- [ ] **I, Armando A. Falcon, MD, approve the men's TRT starting-regimen logic above for live use.** Date: ______

One thing is locked regardless: **you never appear as the prescriber** — the plan is signed by the logged-in clinic
provider's NPI, and dosing is emitted only on the candidate-review path with all safety gates clear.

**Status: VERIFIED & live (DRAFT-dose pending your Q1–Q4 confirmation).** No fabricated dose; principle + monitoring
grounded in Endocrine Society 2018, formulation doses in FDA labels (VERIFY-AT-LOCK against current product labels).
