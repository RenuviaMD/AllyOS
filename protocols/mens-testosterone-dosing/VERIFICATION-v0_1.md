# Men's Testosterone Target/Dosing/Administration Addendum v0.1 — AllyOS audit

Date: 2026-06-30 · Auditor: AllyOS · File SHA-256-verified against the manifest (cbd7d98d…).

## What this is
Dr. Falcon's authoritative RenuviaMD protocol spec for men's testosterone targets, dosing, and administration —
wellness-focused (physiologic restoration, not enhancement). Transcribed into `allyos/mens-poc.html` `testosteroneRx()`,
shown only on the candidate-review eligibility path. It answers and supersedes the placeholder Q1–Q4 in
`protocols/mens-poc-signoff/TRT-DOSE-SIGNOFF-v0_1.md`.

## Citation posture (all anchors previously PubMed/label-verified)
- **AUA Testosterone Deficiency Guideline** (PMID 29601923) — middle-tertile target ≈450–600; 100 mg weekly > 200 q2wk example.
- **Endocrine Society 2018** (PMID 29562364) — mid-normal target, diagnosis/contraindication gates, monitoring.
- **ACP 2020** (PMID 31905405) — wellness-claim guardrail.
- **FDA 2025 class-wide label** + **TRAVERSE** (PMID 37326322) — BP/CV context.
- **HHS/FDA 2026 requested update** — prostate/BPH context (advisory).
- **DailyMed product labels** — route-specific dosing (AndroGel 1.62%/1%, XYOSTED, oral undecanoate, Testopel).

No fabricated source. The guideline targets (450–600 / mid-normal) and the FDA-label route doses are consistent with
their cited sources.

## VERIFY-AT-LOCK (label-specific, confirm against the live DailyMed PI before final lock)
- XYOSTED SC auto-injector: 75 mg weekly start; **350–650 ng/dL** monitoring window; ±25 mg adjust.
- Oral testosterone undecanoate: 200 mg BID with food; min 100 mg daily / max 400 mg BID per product label.
- Testopel pellets: 150–450 mg SC every 3–6 months.

## Applied to the engine
Target 450–600 (avoid >900–1000, lowest effective dose) · preferred route order topical → weekly injectable →
SC auto-injector → oral → pellets (not-first-line) · estradiol do-not-auto-suppress + monitor on triggers ·
Hct >54% stop · BP every visit · PSA/prostate · fertility/OSA/LUTS gates · expanded blocked-claims
(no supraphysiologic, pellets-not-best, compounded-not-safer, don't chase highest).

**Status: VERIFIED & applied; live on the candidate path. Pending MD initials on the (now-resolved) sign-off sheet
and two DailyMed VERIFY-AT-LOCK confirmations.**
