# Peptide module — Medical Director VERIFY sign-off checklist

**Module:** `protocols/peptide-module.json` (v1.0-draft)
**For:** Armando A. Falcon, MD · FL ME 84789
**Purpose:** The FDA-approved agents are already label-grounded and need no action. The **research / compounded / investigational** agents below carry **prudent-convention or mechanism-based** contraindications marked `(VERIFY)` — these need *your clinical judgment* to clear or correct. Tick each box (or edit the item), and the module flips from DRAFT → locked, MD-signed (same as BHRT/IV).

> How to use: review each agent's items. For each line: **keep** (leave the checkbox, it becomes a confirmed advisory), **edit** (change the wording), or **remove** (strike it). When an agent's list is fully reviewed, check its header box. When all headers are checked, the module is ready to lock.

---

## ✅ Already label-grounded — NO action needed
- **Semaglutide, Tirzepatide, Liraglutide** — FDA labels (Wegovy/Ozempic, Zepbound/Mounjaro, Saxenda/Victoza). Boxed MTC/MEN2 + relatives confirmed.
- **Tesamorelin (on-label)** — EGRIFTA label.
- **PT-141 / Vyleesi** — Vyleesi label.
- **SS-31 / Elamipretide (on-label)** — FORZINITY label.

---

## ☐ Retatrutide  *(investigational — NOT FDA-approved, Phase 3; Tier 3)*
Class-extrapolated, no label. Clear/correct each:
- [ ] Personal/family MTC or MEN 2 — class signal, not label-established
- [ ] Hypersensitivity to peptide/diluent
- [ ] Pregnancy/planning; lactation
- [ ] Acute/recent pancreatitis
- [ ] Severe gastroparesis / severe GI disease
- [ ] Tachyarrhythmia / uncontrolled arrhythmia / decompensated HF / ischemic heart disease — dose-dependent HR rise; baseline HR/ECG if cardiac risk
- [ ] Cholelithiasis / gallbladder disease
- [ ] Insulin/sulfonylureas (hypoglycemia)
- [ ] Volume depletion / CKD
- [ ] Glucagon agonism may raise glucose/hepatic output (caution brittle diabetes)
- [ ] Age <18
- [ ] **Data-layer note:** no baseline-tagged monitoring item (all keyed "follow-up") despite the cadence text → confirm baseline draws (A1c/glucose/renal/BP-HR) per standard GLP-1 cadence.

## ☐ Sermorelin  *(off-label adult wellness; Tier 3)*
- [ ] Active malignancy
- [ ] Pregnancy/lactation; age <18
- [ ] Hypersensitivity to sermorelin or diluent
- [ ] Non-functional pituitary / disrupted HP axis (won't respond)
- [ ] Untreated/severe hypothyroidism (treat first)
- [ ] Diabetes/insulin resistance (monitor glucose/A1c)
- [ ] Fluid retention / edema / arthralgia / carpal tunnel
- [ ] OSA
- [ ] Active proliferative / severe non-proliferative diabetic retinopathy
- [ ] Acute critical illness (consider hold)
- [ ] Concurrent glucocorticoids may blunt GH response

## ☐ AOD-9604  *(investigational; Grade D → Tier 4)*
- [ ] Hypersensitivity to peptide/diluent
- [ ] Pregnancy/lactation (no human data)
- [ ] Age <18
- [ ] Active malignancy — precautionary, weak GH-axis rationale
- [ ] Compounded/unregulated sourcing
- [ ] No established DDI profile

## ☐ MOTS-c  *(investigational; Tier 3; PCAC review Jul 2026)*
- [ ] Hypersensitivity to peptide/diluent
- [ ] Pregnancy/lactation (no human data)
- [ ] Age <18
- [ ] Active malignancy — precautionary, mixed preclinical signals
- [ ] Diabetes/glucose-lowering agents (AMPK/insulin sensitization; theoretical additive hypoglycemia; monitor glucose)
- [ ] Compounded/unregulated sourcing
- [ ] No established DDI profile

## ☐ SS-31 (compounded / off-label metabolic use)  *(on-label FORZINITY items are NOT VERIFY)*
- [ ] Pregnancy — limited human data (off-label use)
- [ ] Lactation — no human data
- [ ] Active malignancy — precautionary in compounded longevity use, not a label CI
- [ ] Compounded SS-31 vs FORZINITY — purity / benzyl-alcohol / dosing unverified

## ☐ Tesamorelin (off-label anti-aging use)
- [ ] Off-label anti-aging consent tier = 2 convention — confirm or set
- [ ] (On-label HIV-lipodystrophy items already label-grounded — no action)

## ☐ PT-141 (label nuances)
- [ ] Oral naltrexone-containing products — may significantly decrease naltrexone levels, not recommended (confirm exact label wording)
- [ ] Severe hepatic or renal impairment

---

## Carry-forward data-layer notes (not blockers)
- **Pregnancy placement** is intentionally non-uniform across the GLP-1s (tirzepatide → relative; sema/lira → absolute) — faithful to the labels. Confirm you're comfortable with that split.
- **Retatrutide baseline monitoring** gap lives in `monitoring-map.json`; fix there at the data-layer lock (add baseline-tagged items).

---

## Sign-off
When the above are reviewed:

```
Medical Director governance sign-off
  by:      Armando A. Falcon, MD
  license: FL ME 84789
  role:    Medical Director — governance / framework approval (not per-patient treating provider)
  date:    __________
```

On your word, I set `meta.status: locked`, `meta.effective`, record `meta.md_signoff`, and propagate the locked state to Ally + `peptides.html` + the index card (exactly as done for BHRT).
