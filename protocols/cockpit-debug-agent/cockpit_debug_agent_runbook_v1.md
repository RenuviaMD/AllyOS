# Cockpit Debugging Agent Runbook v1

Date updated: 2026-06-29

## Where it runs
- Clinic dashboard: incident trigger/report button.
- Central cockpit: Debugging Agent execution and triage.
- Repo/CI: validation tests and patch checks.
- Medical Director review queue: clinical approval.
- Clinics: receive approved version only.

## Standard workflow
1. Clinic sends de-identified incident trigger.
2. Cockpit classifies severity.
3. Debugging Agent reproduces and traces modules.
4. Root-cause report generated.
5. Patch proposal created if appropriate.
6. Validation case added.
7. Clinician/engineering review routed.
8. Approved patch is versioned and published centrally.
9. Clinic pulls approved version.

## Never do
- Never auto-edit clinical rules.
- Never auto-publish safety gate changes.
- Never store PHI in repo logs.
- Never call a commercial source clinical proof.
- Never downgrade SEV-1 without clinician review.
