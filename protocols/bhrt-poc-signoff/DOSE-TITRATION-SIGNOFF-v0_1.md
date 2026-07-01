# BHRT Plan-of-Care generator — dose & titration sign-off sheet (v0.1 DRAFT)

For: Armando A. Falcon, MD — Medical Director, RenuviaMD® / AllyOS
Prepared by: AllyOS audit (PubMed live verification) · 2026-06-30
Scope: every dose, titration step, and monitoring claim emitted by `allyos/bhrt-poc.html`.
Purpose: one-read approval. The engine **proposes**; you **decide & sign**. Nothing goes live to a clinic until you initial below.

According to PubMed, citations verified as noted. Each row: what the tool prints → source → verdict.

---

## A. Systemic 17β-estradiol (transdermal-preferred)
**Tool prints:** Start **0.025–0.05 mg/day**; reassess q4wk; titrate by symptom response toward **0.05–0.1 mg/day** (ceiling 0.1). Patch 1–2×/wk or gel/spray daily; rotate sites; never on breasts. Confirmatory on-therapy estradiol ~50–150 pg/mL.

- **Titration ladder 0.05 → 0.075 → 0.1 mg/day is NOT an inference** — these are the actual FDA-approved transdermal estradiol patch strengths (0.025 / 0.0375 / 0.05 / 0.075 / 0.1 mg/day). The ladder maps 1:1 to real product strengths. ✅
- Transdermal-preferred (lower VTE/stroke vs oral) + symptom-titration: consistent with **NAMS 2022 HT Position Statement** (PMID 35797481, verified prior). ✅
- **VERDICT: ✅ defensible as written.** Optional precision: the gel/spray strengths differ by product (e.g., 0.06% gel pumps, metered spray 1.53 mg/spray) — if you want the gel/spray dosing spelled out per product, say so; today it correctly stays at "once daily, titrate to response."

## B. Micronized progesterone (uterus intact)
**Tool prints:** **100 mg PO at bedtime continuous**, or **200 mg ×12–14 days/cycle**. Required for endometrial protection with systemic estrogen + intact uterus; GABA-ergic sleep/anxiety benefit.
- Matches the FDA Prometrium label and **NAMS 2022**. ✅
- **VERDICT: ✅ defensible as written.**

## C. Local (vaginal) estrogen — GSM
**Tool prints:** low-dose vaginal estradiol cream/tablet/ring; alternatives vaginal DHEA/prasterone or ospemifene PO; **not gated by the systemic-estrogen uterus rule**.
- Consistent with **NAMS 2022** and the AUA/SUFU GSM guidance. Low-dose vaginal estrogen does not require a progestogen. ✅
- **VERDICT: ✅ defensible as written.**

## D. Testosterone — HSDD only (off-label in women)  ← 2 refinements for your call
**Tool prints:** HSDD only; first address GSM + reversible factors; if low desire WITH distress persists → provider discussion, low-dose transdermal titrated to female physiologic range; not for energy/mood/weight; monitor androgenic effects. Cites ISSWSH 2021 + Global Consensus 2019.
- **ISSWSH 2021 CPG VERIFIED** — PMID 33792440, Climacteric 2021;24(6):533-550, [DOI](https://doi.org/10.1080/13697137.2021.1891773). It supports: symptom-not-lab diagnosis, biopsychosocial-factors-first, transdermal, physiologic premenopausal range, screen for androgen excess. ✅
- **Global Consensus 2019 VERIFIED** — PMID 31498871, [DOI](https://doi.org/10.1210/jc.2019-01603) (postmenopausal HSDD only; not energy/mood/cognition). ✅
- **REFINEMENT 1 (your call):** ISSWSH explicitly states **compounded testosterone cannot be recommended** (no efficacy/safety data) and prefers a **government-approved MALE formulation cautiously dosed down for women**. Today the generic `compNote` ("compounding per provider decision & pharmacy of choice") is appended to this block too. Recommend: for the **testosterone** block specifically, replace the generic compounding note with ISSWSH's stance — *"use a government-approved male transdermal product dosed to the female physiologic range; compounded testosterone is not recommended (ISSWSH 2021)."* → **Approve / modify / leave as-is?**
- **REFINEMENT 2 (already correct, confirming):** ISSWSH says total testosterone is a **monitoring baseline, not a diagnostic** — the tool is already symptom-driven, so this is consistent. ✅
- **VERDICT: ✅ sound; one wording refinement (R1) recommended.**

## E. Non-hormonal VMS (if MHT declined / not used)  ← 1 refinement for your call
**Tool prints:** fezolinetant 45 mg (FDA; **baseline + monthly×3 LFTs**), paroxetine 7.5 mg (FDA for VMS), or SSRI/SNRI; CBT.
- **Paroxetine 7.5 mg (Brisdelle)** — FDA-approved non-hormonal for VMS. ✅
- **Fezolinetant 45 mg (Veozah)** — FDA-approved NK3 antagonist for VMS. ✅ on the dose.
- **REFINEMENT 3 (safety — your call):** The fezolinetant LFT schedule in the tool ("baseline + monthly×3") is **outdated**. After the 2024 hepatotoxicity signal, the FDA Veozah label expanded monitoring to **baseline, then months 1, 2, 3, 6, and 9**, with patient warning symptoms. (FDA-label fact, not PubMed-indexed — VERIFY-AT-LOCK against the live Veozah PI.) Recommend updating the tool to **"baseline, then 1, 2, 3, 6, and 9 months."** → **Approve update?**
- **VERDICT: ✅ doses correct; extend the fezolinetant LFT schedule (R3).**

## F. Titration logic
**Tool prints:** reassess 8–12 wk; controlled → maintain (3–6 mo); persists + tolerated + below ceiling → step up one level (0.05→0.075→0.1); side effects → reduce / re-evaluate progestogen; **new PMB → evaluate endometrium**; persists at ceiling → reconsider dx / add non-hormonal / refer.
- Symptom-driven step-titration with a hard "new postmenopausal bleeding → endometrial evaluation" stop: consistent with **NAMS 2022**. The step ladder uses real patch strengths (see A). ✅
- **VERDICT: ✅ defensible as written.**

## G. Lifestyle (advisory)
- Physical Activity Guidelines 2018 (PMID 30418471), PROT-AGE protein (PMID 23867520), NIH ODS — all verified prior; framed as wellness support, not a VMS treatment, not sold. ✅
- **VERDICT: ✅ defensible as written.**

---

## Summary for sign-off
| Block | Verdict | Action needed from you |
|---|---|---|
| A Estradiol | ✅ | none (optional: spell out gel/spray per product) |
| B Progesterone | ✅ | none |
| C Vaginal estrogen | ✅ | none |
| D Testosterone (HSDD) | ✅ | **R1**: swap generic compounding note for ISSWSH stance? |
| E Non-hormonal VMS | ✅ | **R3**: extend fezolinetant LFTs to 1/2/3/6/9 mo? |
| F Titration | ✅ | none |
| G Lifestyle | ✅ | none |

**No fabricated dose or citation found.** All regimens map to FDA labels + NAMS 2022 / ISSWSH 2021 / Global Consensus 2019.
Two recommended refinements (R1 wording, R3 safety-monitoring) and one optional (gel/spray detail).

### Sign-off — APPROVED (2026-07-01)
- [x] **R1 — APPROVED & applied.** Testosterone block uses the ISSWSH stance (government-approved male transdermal product dosed to the female physiologic range; compounded testosterone not recommended).
- [x] **R3 — APPROVED & applied.** Fezolinetant LFT schedule extended to baseline, 1, 2, 3, 6, and 9 months (updated FDA Veozah label).
- [x] **I, Armando A. Falcon, MD, approve the BHRT dose/titration logic above for live use in the AllyOS Hormone line.**  Date: **2026-07-01**.

Status: **MD-signed.** R1/R3 applied in `bhrt-poc.html`; live in the Hormone line with the MD-signed badge. Estradiol ladder (0.025–0.1 mg/day) and micronized progesterone verified vs FDA labels + NAMS 2022.
