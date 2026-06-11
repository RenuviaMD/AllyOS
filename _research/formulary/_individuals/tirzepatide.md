---
slug: tirzepatide
name: Tirzepatide
brand_names: [Mounjaro, Zepbound]
axis: Metabolism
status: fda_approved
controlled: false
pricing:
  trial: { usd: 545, duration_weeks: 4, cogs_usd: 245 }
  full:  { usd: 1090, duration_weeks: 8, cogs_usd: 490 }
popup_summary:
  mechanism: "Dual GIP/GLP-1 receptor agonist — central satiety + insulin sensitization"
  primary_use: "Type 2 diabetes and chronic weight management (BMI ≥30, or ≥27 with comorbidity)"
  contraindications_short: "MTC/MEN-2 hx, acute pancreatitis, severe gastroparesis, pregnancy, hypersensitivity"
  clinical_notes_short: "Titrate to tolerance, not by calendar — most 'non-response' is stopping at 5 mg. Cut sulfonylurea/insulin at start to avoid lows. Counsel on oral-contraceptive absorption."
document_meta: { author: "Armando Falcon, MD", version: "2026-06-10", last_clinical_review: "2026-06-10" }
---

# Tirzepatide (Mounjaro / Zepbound)

## Indication
Type 2 diabetes (Mounjaro) or chronic weight management (Zepbound) in BMI ≥30, or ≥27 with a weight-related comorbidity.

## Rule out (contraindications)
- ☐ Personal/family MTC or MEN-2 (boxed — absolute)
- ☐ Acute pancreatitis (active/recent)
- ☐ Severe gastroparesis
- ☐ Pregnancy / planning pregnancy
- ☐ Lactation; age <18
- ☐ Hypersensitivity to tirzepatide

## Rx
- **Dose:** 2.5 mg SC weekly ×4 wk → 5 mg; titrate +2.5 mg q4wk to max **15 mg**
- **Route:** SC weekly
- **Reconstitution:** Commercial pen/vial pre-mixed — **fixed 0.5 mL, no math**. <!-- NOTE: prefer commercial; compounded vials vary, verify concentration -->
- **Cycle:** Chronic
- **Stack pairs:** mots-c, aod-9604

## Labs (baseline)
- A1c, fasting glucose, CMP, lipids
- Pregnancy test; **MTC/pancreatitis history screen ← gating**

## Ongoing care
| When | What to check | What to adjust |
|---|---|---|
| Wk 2 | GI tolerance, hypoglycemia | Cut SU/insulin; manage nausea |
| Mo 1 | Weight, BP, stepped to 5 mg | Advance dose if tolerated |
| Mo 3 | A1c, weight % | Titrate toward goal |
| Mo 6 | A1c, weight, lipids | Effective maintenance dose |

## Safety & compliance gate
- ☐ Off-label/investigational consent signed (`consent_glp1_incretin`) — N/A if on-label
- ☐ Patient education delivered (`patiented_tirzepatide`)
- ☐ Source pharmacy verified
- ☐ MTC/pancreatitis screen documented ← gating

## Patient education key points
- Nausea is common early and usually eases — eat smaller, low-fat meals.
- Report severe abdominal pain (pancreatitis warning).
- Oral birth control may work less well — use backup.
- Protein + resistance training to protect muscle; weight returns if stopped.
