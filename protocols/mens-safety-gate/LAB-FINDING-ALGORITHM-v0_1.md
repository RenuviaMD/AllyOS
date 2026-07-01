# Men's Testosterone Lab-Finding Algorithm — blueprint & build record

Source: RenuviaMD "Testosterone Optimization Lab-Finding Algorithm With Reference Limits" (2026-07-01).
Verified against the Endocrine Society guideline (JCEM 2018;103:1715, PMID 29562364, PubMed-verified),
Quest adult-male reference ranges (match the uploaded patient report), AHA BP categories, ADA A1c/glucose,
FDA testosterone labeling, STOP-BANG, IPSS. No fabrication found; ranges are configurable per §0.

## Core rule (§0) — implemented
Reference limits are **configurable in the POC**, lab's-own-range first (assay/age/units), then guideline
threshold, then clinical context. The engine flags low/high against the **provider-entered** range, never a
hardcoded database. Defaults = Quest adult-male LC/MS.

## Phase 1 — BUILT (allyos/mens-poc.html)
Collapsible UI (native `<details>`) so the intake isn't overloaded: core lab values visible; reference ranges
and the safety gate are collapsed.

- **Configurable ranges:** total T low(300 AUA)/high(1100), free T low(46)/high(224), bio T low(110)/high(575) —
  all editable. Free/bio "low" judged vs the provider's entered ref-low.
- **Discordant-pattern candidacy:** normal total T + low free/bioavailable T (high SHBG) + symptoms + confirmed
  → CANDIDATE; unconfirmed → CONFIRM-FIRST.
- **Start-safety gate (Red / Yellow / Green)** from configurable thresholds:
  - Hct: <48 green · 48–49.9 amber (caution) · ≥50 red (defer, conservative) · ≥54 red (hard stop).
  - BP (AHA): <130/80 green · 130–139/80–89 & ≥140/90 amber · ≥160/100 red (defer) · >180/120 red (crisis).
  - PSA: >4 red · >3 red if high-risk toggle.
  - STOP-BANG: 3–4 amber · ≥5 amber (untreated severe OSA = hard stop via checkbox).
  - IPSS: 8–19 amber · >19 red.
  - A **RED** flag defers an otherwise-eligible candidate (dosing withheld).
- **Unit / implausible-value guard:** warns (never silently decides) on likely unit mistakes — total T <30
  (nmol/L?), SHBG >250, Hct outside 20–70%, and total/free T above range (→ review exogenous androgen/AAS).
- Qualitative hard stops (fertility, cancer, CV/VTE/HF) remain the section-2 checkboxes.

## Phase 2 — BACKLOG (context depth + monitoring)
Estradiol (≤29 ultrasensitive), LH/FSH/prolactin axis, full CBC, metabolic (A1c/glucose/lipids/ApoB), CMP,
thyroid (TSH/FT4) as yellow-context flags; the full §10 monitoring cadence table; §11 route-specific test timing.

## Citations to wire as guardrails (from §13)
Endocrine Society/JCEM (PMID 29562364) · Quest hypogonadism lab guide · FDA testosterone class-wide labeling ·
ADA diagnosis thresholds · AHA BP categories · STOP-BANG · IPSS. (These are org/guideline sources; the one
PubMed-indexed anchor is PMID 29562364, verified.)
