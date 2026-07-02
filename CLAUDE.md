# renuviamd-site — working notes for Claude

## Active project: app-pimaster (PI Master™)
- Vite + React + TS clinical documentation app for Florida PI/PIP clinics. All work happens here unless told otherwise.
- Verify before every commit: `cd app-pimaster && npm run verify` (tests + typecheck + build). Commit AND push in the same turn — a stop hook rejects a dirty tree.
- Backend: Supabase project `pi-master` (ref `fkwqzmnqflmkchiszxub`). `reports`/`form_state` are the clinical record; RLS requires an authenticated, active `app_users` row. Never weaken RLS or re-add anon policies.
- Sibling Supabase projects (read-only research, never modify): `renuviamd-gate` = AHCA Pro, `allyos` = AllyOS.

## Domain rules (learned corrections — treat as spec, do not re-ask or violate)
1. **Exam form**: 3-point functional scale — WNL / Limited / Cannot perform — with verbal patient scripts per maneuver. Normal degrees are REFERENCE ONLY, never recorded as measurements. No graded ROM.
2. **Telehealth**: facility-originated only — the patient is always physically at the clinic in Florida; the provider is remote. Requires consent capture + auto origination statement. Telehealth PE documents observed functional limitation only; NO hands-on findings (tenderness/spasm/palpation). Florida only. Initial/final visits default to in-person (override needs a documented reason).
3. **Nothing invented**: every generated document is built strictly from entered data. No fabricated findings, codes, charges, or narrative variation. Blank stays blank.
4. **Billing identity**: the clinic bills under the clinic (group) NPI → CMS-1500 Box 33a; the doctor's individual NPI is the rendering provider → Box 24J. POS 11 in person; POS 02 + modifier 95 for telehealth (never POS 10 — patient is never at home).
5. **AHCA Pro ≠ AllyOS**: AHCA Pro serves AHCA-licensed clinics (PIP clinics must be licensed, F.S. 400.990+). AllyOS serves non-AHCA cash-pay facilities. Never mix their audit content (no GFE/infusion checkpoints in PI/PIP audits).
6. **Admin layers are PHI-free**: AHCA Pro and every compliance/export surface in PI Master store patient initials + chart reference IDs only — never names/DOB.
7. **Scope: clinical operations ONLY.** No governance/compliance modules in this platform — governance is handled separately (outside this codebase). The only touchpoint is the Encounter Export: rolling LAST-30-DAYS spreadsheet (risk-scored, highest first) + per-chart Report/Superbill that the MD takes to the external system. Do not (re)build facility registries, binder reports, or audit workflows here.
8. **Auth model**: one login screen for everyone; individual user accounts; roles are ASSIGNED BY THE ADMIN via `app_users.roles` (admin/physician/staff/pt).
9. **Clone guard**: ≤20% similarity on PHYSICIAN-AUTHORED text between same-accident patients (auto-generated narrative and unedited templates are excluded from comparison); differentiation must come from real documented findings — never generate artificial variation to pass the check. Multi-occupant (3+) rules: every note is checked against ALL same-accident patients; seat positions are distinct (Driver / Front Passenger / Rear Passenger); two Drivers on one accident date raises a verify warning; exams nearly identical to 2+ other occupants BLOCK until each patient's real distinguishing findings are documented.
10. **7th character**: injury (S/T) ICD-10 codes bill A on initial, D on follow-up/final; sequela (S) is a physician decision, never automatic.

11. **Business model**: the platform's billing documents (superbill/CMS-1500) are the CLINIC's claims — revenue flows clinic ← insurance. Dr. Falcon's revenue is platform subscription fees paid by clinics; where he personally treats, he is paid flat fee/caseload — never per-claim or tied to reimbursement (anti-kickback-safe, matches the printed certification language). Stripe (when built) bills clinics for platform use only; patient/insurance money never runs through the platform.

## User & workflow
- Dr. Falcon is a physician, not an engineer. Messages are terse with typos ("acha" = AHCA, "ally"/"allies" = AllyOS, "fee"→"feed"). When a message re-states how something should work, it is a correction of the build — restate it back, rebuild to match, don't re-litigate.
- He prefers autonomous batch execution: on "go" / "continue" / "one shot", complete the whole scoped item (build → verify → commit → push) without mid-course questions. Propose-first only when he says "tell me" / "advice" / "proposal first".
- Session repo scope is `armandofalcon66/renuviamd-site` only. RenuviaMD-org repos (e.g. `PIP-notes-`) are not readable from here — research them via their Supabase data instead, read-only.
- Deliverables he opens are files: send status reports/presentations as self-contained HTML via SendUserFile.
- Known pending user inputs: EIN + fee schedule (Billing Settings), Supabase BAA, Netlify deploy approval.
