# RenuviaMD BHRT Clinical Decision Engine (Women) v1.0 — blueprint & build record

Source: RenuviaMD "BHRT Clinical Decision Engine — Women" v1.0 (2026-07-01).
Posture verified: symptom-led, safety-gated, uterus-specific, route-specific, compounded-as-exception.

## Citations (verified / flagged)
- **NAMS 2022 HT Position Statement** — PMID 35797481 (PubMed-verified).
- **Global Consensus Testosterone for Women 2019** — PMID 31498871 (PubMed-verified).
- **NICE NG23** (menopause) — selective FSH; transdermal for VTE risk; vaginal estrogen for GSM; lowest effective dose.
- **ACOG Clinical Consensus No. 6 (2023)** — compounded BHRT not routine when FDA-approved exist; pellet caution.
- **NAMS 2023 Nonhormone Position Statement** — CBT/hypnosis/SSRI-SNRI/gabapentin/oxybutynin/NK-antagonists.
- **Veozah (fezolinetant)** — hepatic gate (ALT/AST ≥2×ULN don't start; LFTs baseline,1,2,3,6,9 mo) — matches the
  DailyMed label already verified in this project (consistent with R3).
- **Lynkuet (elinzanetant)** — real (PubMed-indexed, OASIS trials); its LABEL specifics (120 mg nightly, hepatic
  threshold, pregnancy contraindication, 3-mo transaminase check) are **VERIFY-AT-LOCK** against the live PI.

## Core rule (preserved)
Symptoms determine the treatment lane · risk determines whether treatment is safe · uterus status determines whether
progesterone is mandatory · labs support (diagnosis/safety/monitoring), never gate. Labs are optional & confirmatory
(the existing import + confLabs already reflect this).

## Phase 1 — BUILT (allyos/bhrt-poc.html)
Collapsible "Safety & route factors" under section 2; symptom-led plan unchanged.
- **Age-based staging:** >45 clinical diagnosis (no routine FSH/E2); 40–45 selective FSH/E2 + mimics; <40 POI pathway
  (repeat FSH, evaluate; elevated to AMBER — confirm POI before routine wellness BHRT).
- **Red / Amber / Green safety & route gate:**
  - RED: BP ≥160/100 → systemic estrogen suppressed (wellness summary + referral), reason shown. (Existing red-flag
    chips still suppress: bleeding/cancer/VTE/liver/pregnancy/endometrial/uncontrolled-HTN.)
  - AMBER (transdermal-preferred): BMI >30, BP 130–159/80–99, migraine (esp. aura), VTE family hx/thrombophilia, high
    TG, gallbladder disease, diabetes/prediabetes, current smoker, age >60/<40.
  - GREEN: none → oral or transdermal per preference.
  - Outputs a route recommendation (transdermal-preferred when route-risk present) + staging note; the gate governs
    safety & route, NOT candidacy. Verified by render: green / amber (BMI+migraine → transdermal) / red (BP defer).

## Phase 2 — BACKLOG
Configurable lab anchors + context flags (the Module-4 table); abnormal-bleeding engine (Module 8); compounded-exception
documentation (Module 6); monitoring-cadence table (Module 7); DHEA lane (Lane E); elinzanetant added to the nonhormonal
lane (after Lynkuet PI verification); QA/audit checklist (Module 11).
