# Batch Design Implementation — session prompt (paste verbatim into a new session on RenuviaMD/AllyOS)

Execute the PI Master batch design implementation. This is an approved, contracted job — do not re-litigate decisions; build.

## Scope guard — absolute
Work ONLY inside `app-pimaster/` (including its `design/` and `prompts/` folders). NEVER modify `ally/`, `allyos/`, `netlify/functions/`, or any file outside app-pimaster — those belong to the AllyOS platform, which other sessions build. PI Master and AllyOS share this repo but nothing else.

## Read first — these are law, in this order
1. `CLAUDE.md` (repo root) — domain rules, workflow, corrections history.
2. `app-pimaster/design/DESIGN_BIBLE.html` — the April build audited screen by screen: the design source of truth (sidebar, dashboards, case list, New Case wizard, Case Detail, MD Visit module, document templates, terminology).
3. `app-pimaster/design/DESIGN_DECISIONS.md` — the physician's 12 adjudications, the approved UX Blueprint addendum (U1–U8), and the PRESERVATION CLAUSE.
4. `app-pimaster/design/UX_BLUEPRINT.html` — the research behind U1–U8 and the anti-patterns to avoid.
5. `app-pimaster/prompts/*.md` — locked AI report specs (corrections at the bottom supersede the body).

## Preservation clause — never violate
Engine behavior does not change: in-person vs telehealth modality logic (consent gate, observation-only exam, POS 02+modifier 95 vs POS 11, § 456.47 language), visit-type behavior (initial/follow-up/final), the 3-point functional exam (WNL/Limited/Cannot — never graded ROM/degrees), EMC citing § 627.732(4), clone guard + multi-occupant rules, multi-clinic RLS scoping, fee schedule, carrier routing to the CMS-1500, document package rules (once-per-patient forms, reprint from archive), AI report pipeline (PHI-minimized placeholders), EMR terminology standard (NKDA, PMH/PSH, EtOH, AAOx3, MVC). The batch restyles and rearranges the UI; it never alters clinical, billing, or compliance behavior. All 100+ existing tests must keep passing.

## Already done (do not redo)
Increment 1 — persistent patient banner (PatientBanner.tsx, UX U2): name · age/sex · DOB · carrier · claim # · DOA · days-post-accident counter (green ≤14, red >14) · visit-type/modality badges.

## Build these increments, in order — each one: implement → `npm run verify` green → drive the real UI in a browser (Playwright, stubbed Supabase; see scratchpad patterns in session history or write fresh) → commit → PR to main → merge (deploys automatically)
1. **U1 — Today's Visits landing per role.** Staff: today's check-ins + packet status; Physician: today's queue with one-tap open-encounter; PT: today's sessions. Data: reports with dos = today + the active draft. Registry link + New Visit prominent.
2. **U6 — Global sidebar + patient search.** The Bible's 230px sidebar: brand block, clinic tag, role-filtered nav (Dashboard, Patients, Billing, Documents, Archive; admin/platform items per role), patient search activating at 3+ chars (last name, first, or phone digits) over the clinic's reports/drafts; "/" keyboard shortcut. Header slims down accordingly.
3. **Patients registry + Case Detail.** The Bible's patient list (grouped like the attorney package: name+DOB+DOA) with status badges; Case Detail overlay with tabs (Overview / Timeline / Documents / Billing) — the Timeline is the chronological record (visits, documents, orders newest-first) with pinned action items (unsigned packet forms, EMC pending, imaging not reviewed) (U5).
4. **U3 — Encounter stepper.** The physician's 12-section scroll becomes the Bible's phased MD Visit module: History → Exam → Assessment → Plan → Sign, progress indicator, Enter-to-advance, the audit as the gate on Sign, AI drafting inline in the flow (U7). Staff intake stays a 2-step flow; PT keeps its module. Preserve every existing section's fields and rules exactly.
5. **Packet completion.** Add the two missing reception forms per the 6-form ruling: PIP regulation sheet and excluded-services acknowledgment — pre-filled like the rest, registered in packageDocs (staff-produced, patient-signed, once per patient), archived, in the attorney package order.
6. **U4 — Exam macros.** Whole-exam-normal one-tap (extend existing region WNL buttons), physician phrase library (quick-texts stored per user or clinic) for HPI notes and procedure notes. Target: routine follow-up documented in under 60 seconds.
7. **U8 — Visual tuning.** Keep the teal/gold dark identity; tune contrast for long sessions, consistent status colors (Bible's badge vocabulary), larger touch targets for front-desk tablets, soft section transitions. No mega-menus, no alert stacking, no configurable-everything.

## Working style
Autonomous batch execution: complete each increment fully (build → verify → browser-drive → commit → merge) without mid-course questions; ask only if an instruction conflicts with the contract files. Commit messages: imperative summary + why; no model names; end with the session trailer used by this repo's commits. The physician is not an engineer — final summaries in plain clinical-workflow language.
