# Design Bible adjudications — Dr. Falcon, 2026-07-04

Rulings on the 12 inconsistencies flagged by the PI-Master- design audit
(design/DESIGN_BIBLE.html §7). These are LAW for the batch design
implementation and all future document generation.

## Physician rulings (2026-07-04)
1. **EMC statutory citation**: EMC documents and references cite **Fla. Stat. § 627.732(4)**
   (the EMC definition) ONLY. Never § 627.409 (fraud statute). § 627.736 remains correct
   for non-EMC PIP-benefit contexts (14-day rule, AOB benefits). — APPLIED: note EMC line,
   EMC certification, audit message, Section 7 UI label, AI prompts (function v5).
2. **Canonical ICD-10 extremity codes**: keep the canonical set already in the derivation
   engine and the locked prompt map — Shoulder S43.401A/S43.402A; Knee S83.91XA/S83.92XA
   (S43.42x / S83.40x variants rejected).
3. **Post-traumatic headache**: **G44.309 family** (G44.319 acute variant in the catalog
   is compliant). Never G44.1.
4. **Orientation**: **AAOx3** on exam and all reports. — APPLIED: AI prompts (function v5).
5. **PT frequency**: **3–5×/week as clinically indicated**; app default 3x/week
   (physician adjusts per patient). — APPLIED: emptyForm default + AI prompts.
6. **Sworn Affidavit**: use the NEW affidavit text (app-pimaster report.ts,
   buildAffidavitHtml) — the old repo's wording is retired.

## Settled earlier (2026-07-03 session)
7. **E/M set**: 99204/99205 (new) + 99214/99215 (established). "99206" was a typo — no such CPT.
8. **Imaging CPTs**: 72052-family (72052 cervical complete, 72072 thoracic, 72100 lumbar,
   73030 shoulder, 73070 elbow, 73110 wrist, 73562 knee 3 views, 73610 ankle) + 73502 hip
   (73510 is a retired code).
9. **Fee schedule**: ONE master — the per-clinic 220%-of-Medicare schedule in
   clinic_service_catalog. All documents price from it; blank prints blank.
10. **Branding**: PI Master™ everywhere ("RenuviaMD Gate" drift retired); running footer:
    "PI Master™ — PIP Documentation & Compliance · Powered by RenuviaMD® Network".
11. **Reception packet**: the 6-form packet is truth. Current build has AOB, records
    release, 14-day attestation, telehealth consent (+ physician affidavit). BATCH TODO:
    add the **PIP regulation sheet** and **excluded-services acknowledgment**.
12. **Staff scope**: staff enter demographics + accident intake facts and print
    patient-signature forms; clinical documentation, EMC, and affidavit are physician-side.

## UX Blueprint approved (2026-07-04, Dr. Falcon: "yes go")
Research-backed upgrades (design/UX_BLUEPRINT.html) approved for the batch design
implementation, applied ON TOP of the April design (Design Bible):
- U1 Today's Visits landing per role · U2 persistent patient banner (with
  days-post-accident counter) · U3 encounter stepper (phased MD visit, audit gate
  on Sign) · U4 defaults-first exam + physician phrase macros (60-second follow-up
  target) · U5 case timeline in Case Detail with pinned action items · U6 patient
  search everywhere ("/" shortcut) · U7 AI drafting inline in the encounter flow ·
  U8 keep teal/gold dark identity, tuned contrast/targets.
- Anti-patterns banned: mega-menus, alert stacking, configurable-everything.

**PRESERVATION CLAUSE (physician directive):** every engine design stays exactly
as built — in-person vs telehealth modality logic (consent gate, observation-only
exam, POS 02/modifier 95 vs POS 11, §456.47 language), visit-type behavior
(initial/follow-up/final), 3-point functional exam, EMC/§627.732(4), clone guard,
multi-clinic RLS, fee schedule, carrier routing, document package rules, AI report
specs. The batch restyles and rearranges the UI; it never alters clinical,
billing, or compliance behavior.

## GOVERNING WORKFLOW CONCEPT (2026-07-04, Dr. Falcon — supersedes form-first assembly)
**The complaint IS the command: region in → everything out.** The physician enters
the chief complaint (region + laterality + pain n/10 + brief qualifiers) and the
platform generates the entire region thread automatically: ICD-10 with laterality
and encounter suffix, the imaging order (72052-family), the PT prescription, the
AI narrative/pain profile. The physician REVIEWS and prunes — never hand-assembles.
Regions without a complaint produce nothing (locked spec rule 3). Core engine:
src/lib/cascade.ts + the Chief Complaints picker in Section 2 (physician view).
The batch implementation must carry this concept through the encounter stepper:
complaints are step one of the MD visit; every later step arrives pre-built from
them.
