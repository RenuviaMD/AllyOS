# AllyOS clinical workflows — the three-line poster set

Infographic-ready workflow specs for the three care lines. They are a **matched set**: same
status legend, same "decision support only" footer, and an **identical shared spine** —
*de-identified capture → monthly MD risk-based audit → signed report → clinic binder* (steps 9–10
in each). Only the middle steps (the clinical content) and each line's "honest core" differ.

**Status legend (shared)**
🟢 GREEN = cleared / proceed · 🟡 AMBER = hold for missing data / vitals · 🔴 RED = hard stop / emergency / refer · 🟣 PURPLE = override / compounded / off-label exception with documented rationale

**Roles (shared)**
- 🩺 **Provider (MD/DO/NP/PA)** — owns the clinical decision (GFE for IV; evaluation + prescription for peptides/BHRT). Often off-site.
- 💉 **RN / staff** — administers / supports under standing orders; never selects, prescribes, or clears red flags.
- 🤖 **Ally** — advisory screening, evidence, documentation, de-identified capture. Never decides.
- ⚖️ **Medical Director** — monthly risk-based audit + governance. Off-site.

---

## 1 · IV / IM Wellness Workflow
*Nurse-run infusion under standing orders · provider-gated · MD-governed*

**START · Patient arrives for a wellness IV/IM visit** (adults ≥18, wellness scope only)

1. **GFE GATE** 🩺 — Good Faith Exam on file, performed & signed by a provider (MD/DO/NP/PA) within 12 months.
   🔴 No / expired → **STOP, no infusion** (provider completes GFE in clinic system; RN cannot perform it). 🟢 Current → proceed.
2. **CONSENT GATE** 💉 — signed wellness IV/IM consent (risks · wellness-not-disease · EMS authorized).
   🔴 No → **STOP**. 🟢 Yes → proceed.
3. **BUILD THE BAG** 💉 — pick a pre-built protocol or à-la-carte → base fluid + volume + additives.
4. **SAFETY SCREEN (live)** 🤖 — *honest core.* Every additive screened against patient conditions + published rules. High-risk triggers: IV NAD+, Vit C ≥7.5 g (G6PD), Mg + Ca together, glutathione + asthma, renal/cardiac/pregnancy. Dose ceilings · compatibility (glutathione push-only; calcium not in Vit C bag) · rate floors.
   🔴 Critical conflict → hold. 🟣 Override needs logged reason (advisory) — **absolute stop in MD-of-record mode**. 🟢 Clear → proceed.
5. **PRE-INFUSION VITALS (hold check)** 💉 — BP/HR/SpO₂/Temp in range · no red-flag · IV access patent.
   🟡 Out of range / red flag → hold, recheck or defer. 🟢 OK → start.
6. **INFUSE — monitored** 💉🤖 — live timer (drip + pump rate) · 5-min / 2-min audible alarms · tap-monitoring (feels-OK / flushing / nausea / dizziness / red-flags) · mid-infusion vitals if >60 min.
   🔴 Adverse event → emergency cards (CARD-A anaphylaxis · CARD-V vasovagal · extravasation) → EMS → FORM-04. ⏹ Stop / Suspend any time → recorded as suspended (reason + mL given).
7. **DISCHARGE** 💉 — post-infusion vitals · tolerated well · ambulates without orthostatic symptoms · **aftercare handout (FORM-03)**.
8. **SIGN THE NOTE** 💉 — auto-composed infusion note (Why / What / How / Outcome + compliance attestation) → signed → date-stamped → generates **Encounter ID**.
9. **DE-IDENTIFIED CAPTURE (automatic)** 🤖 — Encounter ID · gates · risk flags · monitoring · AE · suspended · outcome → audit log (PHI-free, no name/DOB).
10. **MONTHLY MD OVERSIGHT (off-site)** ⚖️ — risk-based sample (top-5 + 100% of AE / suspended / override charts) → verify GFE · consent · monitoring → Pass / Correction + defect scoring → signed **Monthly MD Oversight Report** → clinic binder. Records stay at the clinic; AllyOS purges the packet (~30 days).

---

## 2 · Peptide Wellness Workflow
*Provider-prescribed · evidence-graded · source-verified · MD-governed*

**START · Patient seeking a peptide wellness program** (adults ≥18, wellness scope only)

1. **WELLNESS FIT?** 🩺 — wellness optimization, not disease treatment / acute illness. 🔴 Complex illness → refer. 🟢 Stable candidate → proceed.
2. **RED-FLAG / EXCLUSION SCREEN** 🤖🩺 — by class: **GLP-1** (personal/family medullary thyroid CA or MEN2, pancreatitis hx, severe GI disease, eating disorder, pregnancy/breastfeeding); **GH secretagogues** (active/prior cancer, uncontrolled diabetes, pituitary disease); general (pregnancy, active malignancy, unstable comorbidity).
   🔴 Red flag → do not start; refer / co-manage. 🟢 Clear → proceed.
3. **AUTHORIZED PRESCRIBER + EVALUATION** 🩺 — provider of record evaluates & will prescribe. Minimum data: goal · history · meds/allergies · baseline labs as indicated · pregnancy status.
   🔴 RN/staff listed as prescriber → **BLOCKED** (route to APP/physician). 🟢 Authorized provider → proceed.
4. **EVIDENCE GRADE → CONSENT TIER** 🤖 — *honest core.* Every peptide carries an evidence grade; the disclosure/consent tier scales with it: FDA-approved (e.g., GLP-1 semaglutide/tirzepatide) → standard; 🟣 compounded/off-label → documented rationale + elevated tier; low-evidence/research-grade → strongest disclosure or suppress.
   🔴 No source / no grade → recommendation suppressed ("no source = no recommendation").
5. **SELECT PROTOCOL / STACK + INTERACTION SCREEN** 🩺🤖 — from the graded lineup (metabolic / GLP-1 · weight-loss · recovery); set dose/route/titration; Ally screens interactions against meds & peptides; honors ceilings. 🟡 Interaction / missing data → hold.
6. **SOURCE / COMPOUNDING CHECK** 🩺 — FDA-approved vs 503A/503B compounded; pharmacy/source · concentration · BUD/expiration documented.
   🔴 Research-chemical / "not for human use" / unverifiable → **BLOCKED**. 🟣 Compounded → documented exception. *AllyOS is pharmacy-agnostic — no brokering, no product sales.*
7. **ADMINISTER / DISPENSE + EDUCATE** 💉 — in-office injection (IM/SC) under order, or dispense for self-administration → technique · storage · sharps · what to watch for.
8. **MONITOR / FOLLOW-UP** 🩺 — class-specific: GLP-1 → GI tolerance, weight, glucose, pancreatitis/gallbladder symptoms; secretagogues → glucose/IGF-1, cancer surveillance. Titration · adverse-effect review · refer if new red flags.
9. **DE-IDENTIFIED CAPTURE (automatic)** 🤖 — Encounter ID · peptide/protocol · grade & source · consent tier · screening · AE · outcome → audit log (PHI-free).
10. **MONTHLY MD OVERSIGHT (off-site)** ⚖️ — risk-based sample + 100% of AE / compounded-source-concern / new-start / RN-boundary charts → verify eval · consent tier · source · monitoring → Pass / Correction + defect scoring → signed **Monthly Oversight Report** → clinic binder.

---

## 3 · BHRT / Women's Hormone Wellness Workflow
*Provider-prescribed · referral-gated · compounded-exception · MD-governed*

Full clinical engine: **Ally BHRT Provider CDS Engine v1.5** (provider-facing, draft pending MD lock).
The provider-facing decision tree (poster) is the 7-step flow below; the engine adds the medication
registry, safety gates, APP-only prescribing rule, MD governance, and the monthly chart-audit method.

**START · Women's hormone wellness visit** (stable, wellness-focused menopause care only)

1. **WELLNESS FIT?** 🩺 — menopause/perimenopause symptoms affecting QoL; stable outpatient candidate. 🔴 Complex illness → refer. 🟢 → proceed.
2. **IMMEDIATE EXCLUSION / RED-FLAG SCREEN** 🤖🩺 — postmenopausal/unexplained bleeding · breast/endometrial cancer history · VTE/PE/stroke/MI/thrombotic risk · active liver disease · pregnancy · severe pelvic/vulvar/urinary/psychiatric red flag.
   🔴 Any red flag → do not finalize BHRT; refer / co-manage. 🟢 None → proceed.
3. **MINIMUM DATA COMPLETE?** 🩺 — age · LMP/cycle · menopause stage · uterus status confirmed · symptom domains · BP/BMI/smoking/meds/allergies · current hormone use.
   🟡 Incomplete → hold, obtain missing data. 🟢 Complete → proceed.
4. **AUTHORIZED PRESCRIBER** 🩺 — physician/DO/APRN/ARNP/PA only. 🔴 RN/staff as prescriber → **BLOCKED**, route to provider.
5. **DOMINANT SYMPTOM DOMAIN → PATHWAY** 🩺 — *honest core: FDA-approved before compounded.*
   - **A · Vasomotor/Sleep** → systemic MHT candidate? prefer FDA-approved transdermal 17β-estradiol; **if uterus intact → add evidence-based progestogen**; if hysterectomy → estrogen alone may be considered. If not a candidate → nonhormonal VMS (D).
   - **B · GSM/Vulvovaginal/Urinary** → moisturizers/lubricants · low-dose vaginal estrogen · vaginal DHEA or ospemifene. Systemic not required if isolated to GSM.
   - **C · Low libido / HSDD** → complete biopsychosocial assessment; rule out GSM/mood/meds/relationship/sleep first; **testosterone only for diagnosed HSDD with provider oversight** — not for energy/mood/cognition/body composition.
   - **D · Nonhormonal VMS** → fezolinetant (with liver monitoring) · SSRI/SNRI · gabapentin · oxybutynin · CBT / clinical hypnosis.
6. **COMPOUNDED EXCEPTION** 🟣 — not default therapy; only with documented rationale (unavailable dose/formulation, intolerance, allergy to FDA-approved). Provider override required. (Biest, estradiol RDT, compounded progesterone/testosterone, vaginal DHEA.)
7. **FOLLOW-UP / MONITORING** 🩺 — reassess symptoms/sleep/bleeding/adverse effects/adherence · BP/weight/interval history · update route/dose only with documented response & safety review · refer if new red flags.

*(Then the shared spine: de-identified capture → monthly BHRT chart audit → signed QA note → binder. The v1.5 engine §14 defines the audit method — risk score 1–5, 23-item checklist, defect severity, MD-review triggers.)*

---

## How the three line up

| | IV / IM | Peptides | BHRT |
|---|---|---|---|
| Shape | Nurse-run timer | Provider prescribe → monitor | Provider prescribe → monitor |
| Hard gate | GFE + consent | Red-flag screen + authorized prescriber | Red-flag screen + authorized prescriber |
| Honest core | Live additive screen + ceilings | Evidence grade → consent tier | FDA-approved before compounded |
| Exception (🟣) | Override with reason | Compounded / off-label peptide | Compounded hormone |
| Who administers | RN at chair | RN injection / self-admin | Provider Rx, patient self-admin |
| Shared spine | **De-identified capture → monthly MD risk-based audit → signed report → binder** (identical) |

**The shared spine is the product.** Steps 9–10 are the same across all three — one MD audit/oversight
engine, three content modules feeding it. That is the "govern many clinics from home" capability,
expressed as workflow.
