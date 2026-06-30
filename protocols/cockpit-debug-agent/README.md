# Cockpit Debugging / Incident-Triage Agent v1

Saved 2026-06-30. Design package for the **field-incident** loop: when something goes
wrong in a live clinic, a de-identified incident is triaged centrally in the cockpit,
root-caused, and turned into a patch proposal + validation case — **never** an automatic
clinical edit. Medical Director signs off; a version publisher releases approved versions.

This is the **third** AllyOS agent design, and it is complementary, not redundant:

| Agent | Trigger | Question it answers | Runtime in this repo |
|---|---|---|---|
| `scripts/health-check.py` | every push / daily | Is the codebase structurally sound? | built |
| `protocols/cds-update-agent` → `scripts/ops-audit.py` | daily / on-demand | Has the *evidence* drifted? | built |
| **`protocols/cockpit-debug-agent`** (this) | a clinic hits a bug in the field | What *failed*, was safety affected, what's the fix? | design saved; UI slice built (see below) |

## What's in the package (all 10 files SHA-256-verified against the manifest)
- `cockpit_debug_agent_master_prompt_v1.md` — the agent's job, triage order, failure classes, "never" rules.
- `cockpit_debug_agent_runbook_v1.md` / `cockpit_debug_agent_architecture_v1.md` — where it runs and the dashboard→cockpit→repo→MD→publish flow.
- `clinic_incident_trigger_schema_v1.jsonl` — the **PHI-free** incident payload (required/optional/**forbidden** fields).
- `debug_trace_schema_v1.jsonl` — rule + retrieval trace shape.
- `debug_patch_proposal_schema_v1.jsonl` — proposed-fix shape (clinician/engineering review flags, rollback plan).
- `debug_module_inventory_v1.csv` — the 10 traceable modules and which require clinical review if changed.
- `debug_severity_matrix_v1.csv` — SEV-1..5 with required actions.
- `debug_regression_test_cases_v1.csv` — 8 must-pass triage cases (e.g. low-eGFR magnesium = SEV-1 safety gate).
- `debug_root_cause_report_template_v1.md` — the report the agent fills in.

## Posture (carried straight from the design)
- Clinics **trigger** incidents; they cannot edit active clinical logic.
- Read-only triage + **patch proposal only** — no auto clinical edits, no safety-gate publish without review.
- PHI-free by contract: the trigger schema **forbids** name, full DOB, phone, email, address, SSN, insurance/payment, raw chart.
- Never downgrade a SEV-1 without clinician review; never call a commercial source clinical proof.

## What is built (live as of 2026-06-30)
- **INSTANT deterministic safety hold** (`allyos-help.js` → `instantScreen`): the moment a provider reports an issue, a synchronous, offline, zero-latency screen matches emergency/contraindication red flags (chest pain, anaphylaxis/airway, stroke, syncope, seizure; pregnancy, renal+electrolyte, melanoma+melanocortin, uncontrolled-HTN+PT-141) and shows a **⛔ STOP** hold *before any network call*. The provider never waits on the API or the MD. Bias: round UP, never downgrade.
- **AI triage (background enrichment):** `netlify/functions/debug.js` — grounded in this package (TECHNICAL vs CLINICAL track, SEV-1..5, clinical failure classes, module inventory). It refines/labels the incident but can **never downgrade** the instant deterministic verdict (`mergeTriage` keeps the more severe SEV).
- **Cockpit incident-triage queue:** `clinic-network.html` — SEV-1-first ranking; the MD marks triaged / closed. Backed by the **applied** Supabase `incidents` table (`supabase/incidents-table.sql`), RLS mirrors `gfe_requests` (clinics report, only MD/owner triages).

## Pending (next)
- The Opus triage *runner* that turns a confirmed incident into a full root-cause report + patch proposal + validation case (`debug_root_cause_report_template`, `debug_patch_proposal_schema`) for MD sign-off — today the cockpit shows the triage; the structured patch artifact is manual.
- Proactive point-of-care screening: run `instantScreen` at the moment Ally/chairside *shows* a suggestion (not only when the provider reports it), so the hold appears without anyone having to ask.
