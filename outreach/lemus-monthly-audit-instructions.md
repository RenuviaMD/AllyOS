# Lemus monthly IV/IM audit — how to fill this sheet

**Goal:** one row per IV/IM visit this month. Takes ~1 minute per visit. Send the file back
to Dr. Falcon by email at the end of the month — he selects the highest-risk charts, reviews
them, and returns your **practice status** (compliant / corrections / follow-up).

**No full names.** Use **patient initials** only (e.g. "J.M.") — that's all the audit needs.
Keep the full chart in your own records; this sheet just points to it by `visit_id`.

## What each column means

| Column | What to enter |
|---|---|
| `visit_id` | Your own chart/visit reference (any unique code) |
| `date_of_service` | YYYY-MM-DD |
| `patient_initials` | Initials only — no full names |
| `provider` | Who treated (e.g. "Milagro NP") |
| `service_type` | `IV`, `IM`, or `IV_PUSH` |
| `protocol` | Stack name, or `custom` |
| `key_ingredients` | Quick list (what was in the bag) |
| `vit_c_grams` | Grams of vitamin C if used (number), else blank |
| `nad_mg` | NAD+ dose in mg if used, else blank |
| `mg_and_ca_same_bag` | `Y` if magnesium **and** calcium were in the same bag, else `N` |
| `glutathione_route` | `PUSH`, `IN_BAG`, or `NONE` |
| `intake_complete` | Intake form complete? `Y` / `N` / `NA` |
| `consent_signed` | Signed consent on file? `Y` / `N` / `NA` |
| `gfe_valid` | Valid Good Faith Exam on file? `Y` / `N` / `NA` |
| `pre_infusion_checklist` | Pre-infusion safety check done? `Y` / `N` / `NA` |
| `vitals_pre_post` | Vitals recorded before **and** after? `Y` / `N` / `NA` |
| `mid_vitals_if_over_60min` | If infusion > 60 min, mid-vitals recorded? `Y` / `N` / `NA` (`NA` if ≤ 60 min) |
| `monitoring_documented` | During-infusion monitoring documented? `Y` / `N` / `NA` |
| `aftercare_given` | Aftercare instructions given? `Y` / `N` / `NA` |
| `adverse_event` | Any adverse event? `Y` / `N` |
| `ae_severity` | `NONE` / `MILD` / `MODERATE` / `SEVERE` / `EMS` |
| `md_notified_if_incident` | If an incident, was the MD notified within 24h? `Y` / `N` / `NA` |
| `notes` | Anything worth flagging |

## Notes
- The first two rows are **examples** — delete them before sending.
- Auto-high-risk visits (the MD will likely pull these first): **NAD+**, **vitamin C ≥ 7.5 g**,
  **magnesium + calcium in the same bag**, **glutathione in someone with asthma**, any **adverse event**.
- Use `Y` / `N` / `NA` exactly (uppercase). Leave a cell blank only if it truly doesn't apply.
- Questions while filling it out? Email Dr. Falcon — no patient identifiers in email.
