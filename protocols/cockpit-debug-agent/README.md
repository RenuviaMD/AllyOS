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

## What is built vs. pending
- **Built (UI slice, local-first):** a "Report a problem" incident modal on the clinic dashboard (captures the schema's required fields + a PHI guard) and an **Incident triage** card on the cockpit that severity-ranks open incidents for the MD. Stored device-local for now, in the incident-schema shape.
- **Pending (one approval):** a Supabase `incidents` table + RLS (mirrors `gfe_requests`) so a clinic's incident reaches the cockpit cross-device, and the Opus triage runner (`scripts/incident-triage.py`) that produces the root-cause report + patch proposal. Proposed migration: `supabase/incidents-table.sql` (NOT yet applied).
